import { Provider, Logger } from '@nestjs/common';
import { Redis, RedisOptions } from 'ioredis';

export const REDIS_CLIENT = 'REDIS_CLIENT';

const logger = new Logger('RedisProvider');

export const RedisProvider: Provider = {
  provide: REDIS_CLIENT,
  useFactory: (): Redis | null => {
    const url = process.env.REDIS_URL;
    if (!url) {
      logger.warn(' REDIS_URL no configurada — scheduler en cron clásico');
      return null;
    }

    const esUpstash = url.includes('upstash.io');
    const esTls = url.startsWith('rediss://');

    const opciones: RedisOptions = {
      ...(esTls ? { tls: { rejectUnauthorized: false } } : {}),
      maxRetriesPerRequest: null,
      enableReadyCheck: true,
      retryStrategy: (times: number) => Math.min(times * 1000, 10_000),
      lazyConnect: true,
      connectTimeout: 10_000,
    };

    const cliente = new Redis(url, opciones);

    cliente.on('error', (e: Error) =>
      logger.error(
        `❌ Redis error (${esUpstash ? 'Upstash' : 'local'}): ${e.message}`,
      ),
    );
    cliente.on('ready', () =>
      logger.log(` Redis conectado${esUpstash ? ' (Upstash)' : ''}`),
    );

    logger.log(
      ` Redis configurado — ${esUpstash ? 'Upstash (rediss TLS)' : url.startsWith('redis://') ? 'local' : 'URL personalizada'}`,
    );

    return cliente;
  },
};
