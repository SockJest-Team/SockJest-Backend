import { NestFactory } from '@nestjs/core';
import { BadRequestException, Logger, ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { ErrorCodes } from './common/constants/error-codes';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');

  app.setGlobalPrefix('api');
  app.enableCors({
    origin: process.env.FRONTEND_URL?.split(',') ?? true,
    credentials: true,
  });

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

bootstrap();
