import {
  Injectable,
  Inject,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { Queue, Worker } from 'bullmq';
import type { Redis } from 'ioredis';
import { SchedulerService } from './scheduler.service';
import { REDIS_CLIENT } from '../../config/redis.provider';

const NOMBRE_COLA = 'subastas';
const INTERVALO_MS = 10_000;

@Injectable()
export class SubastasQueue implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SubastasQueue.name);
  private queue?: Queue;
  private worker?: Worker;

  constructor(
    private readonly schedulerService: SchedulerService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis | null,
  ) {}

  async onModuleInit(): Promise<void> {
    if (process.env.SCHEDULER_ENABLED === 'false') {
      this.logger.log(
        '⏸ Scheduler desactivado en esta instancia (SCHEDULER_ENABLED=false)',
      );
      return;
    }
    if (process.env.SCHEDULER_MODE === 'cron' || !this.redis) {
      this.logger.log('⏱ Modo cron clásico (sin BullMQ)');
      return;
    }

    this.queue = new Queue(NOMBRE_COLA, {
      connection: this.redis.duplicate(),
      defaultJobOptions: {
        removeOnComplete: 50,
        removeOnFail: 200,
        attempts: 3,
        backoff: { type: 'exponential', delay: 5_000 },
      },
    });

    await this.queue.add('tick', {}, {
      repeat: { every: INTERVALO_MS },
      jobId: 'tick-subastas',
    } as Parameters<Queue['add']>[2]);

    this.worker = new Worker(
      NOMBRE_COLA,
      async (job) => {
        if (job.name !== 'tick') return;
        this.logger.debug(`⏱ tick ${job.id} — ${new Date().toISOString()}`);

        await this.protegido('abrirSubastas', () =>
          this.schedulerService.abrirSubastasProgramadas(),
        );
        await this.protegido('cerrarSubastas', () =>
          this.schedulerService.cerrarSubastasVencidas(),
        );
        await this.protegido('pagosVencidos', () =>
          this.schedulerService.gestionarPagosVencidos(),
        );
      },
      {
        connection: this.redis.duplicate(),
        concurrency: 1,
        lockDuration: 60_000,
      },
    );

    this.worker.on('failed', (job, err) =>
      this.logger.error(
        ` Job ${job?.name} (intento ${job?.attemptsMade}): ${err.message}`,
      ),
    );

    this.logger.log(
      ' BullMQ activo: tick cada 10s, concurrency=1, 3 reintentos',
    );
  }

  private async protegido(nombre: string, fn: () => Promise<void>) {
    try {
      await fn();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const esRed =
        /ENOTFOUND|ETIMEDOUT|ECONNREFUSED|Connection terminated|max retries/i.test(
          msg,
        );
      this.logger.error(
        esRed
          ? ` [QUEUE] REDIS/BD INALCANZABLE en ${nombre}: ${msg} (reintentará)`
          : ` [QUEUE] BUG en ${nombre}: ${e instanceof Error ? e.stack : msg}`,
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker?.close();
    await this.queue?.close();
  }

  getQueue(): Queue | undefined {
    return this.queue;
  }
}
