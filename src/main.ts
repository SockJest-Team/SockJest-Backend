import { NestFactory } from '@nestjs/core';
import { BadRequestException, Logger, ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { ErrorCodes } from './common/constants/error-codes';
import helmet, { hidePoweredBy } from 'helmet';
import type { Request, Response, NextFunction } from 'express';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');

  app.use(hidePoweredBy());
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
      crossOriginOpenerPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      strictTransportSecurity: { maxAge: 31536000, includeSubDomains: true },
    }),
  );

  const origenes = (process.env.FRONTEND_URL ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  if (origenes.length === 0 && process.env.NODE_ENV === 'production') {
    logger.error(
      'FRONTEND_URL no definida: me niego a arrancar con CORS abierto en producción.',
    );
    process.exit(1);
  }
  app.enableCors({
    origin: origenes.length > 0 ? origenes : true,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.headers.authorization || req.path.startsWith('/api/auth')) {
      res.setHeader('Cache-Control', 'no-store, private');
    }
    next();
  });

  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: (errores) => {
        const detalles = errores
          .map((e) => Object.values(e.constraints ?? {}))
          .flat()
          .join('. ');
        return new BadRequestException({
          code: ErrorCodes.DATOS_INVALIDOS,
          message: `Revisa los datos del formulario: ${detalles}`,
        });
      },
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());

  const puerto = process.env.PORT ?? 4000;
  await app.listen(puerto);
  logger.log(`API corriendo en http://localhost:${puerto}/api`);
}

bootstrap().catch((err) => {
  console.error('Error fatal arrancando la API:', err);
  process.exit(1);
});
