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
  private programador?: ReturnType<typeof setInterval>;

  constructor(
    private readonly schedulerService: SchedulerService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis | null,
  ) {}

  onModuleInit(): void {
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
        attempts: 3,
        backoff: { type: 'exponential', delay: 5_000 },
        removeOnComplete: true,
        removeOnFail: 500,
      },
    });

    this.programador = setInterval(() => {
      void this.encolarTick();
    }, INTERVALO_MS);

    this.worker = new Worker(
      NOMBRE_COLA,
      async (job) => {
        if (job.name !== 'tick') return;

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
        `❌ Job ${job?.name} (intento ${job?.attemptsMade}): ${err.message}`,
      ),
    );

    this.logger.log(
      `✅ BullMQ activo: tick cada ${INTERVALO_MS / 1000}s (setInterval), concurrency=1, 3 reintentos`,
    );
  }

  private async encolarTick(): Promise<void> {
    if (!this.queue) return;
    try {
      await this.queue.add(
        'tick',
        { ts: Date.now() },
        { jobId: `tick-${Date.now()}` },
      );
    } catch {
      // Redis momentáneamente caído: el próximo intervalo reintenta
    }
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
          ? `❌ [QUEUE] REDIS/BD INALCANZABLE en ${nombre}: ${msg} (reintentará)`
          : `❌ [QUEUE] BUG en ${nombre}: ${e instanceof Error ? e.stack : msg}`,
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.programador) clearInterval(this.programador);
    await this.worker?.close();
    await this.queue?.close();
  }

  getQueue(): Queue | undefined {
    return this.queue;
  }
}
