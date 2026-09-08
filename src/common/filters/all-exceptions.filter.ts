import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiException } from '../utils/api-error';
import { ErrorCodes } from '../constants/error-codes';

interface CuerpoErrorNormalizado {
  statusCode: number;
  code: string;
  message: string;
}

const MENSAJE_5XX = 'Algo salió inesperado. Intenta de nuevo en unos momentos.';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const normalizado = this.normalizar(exception);

    if (normalizado.statusCode >= 500) {
      this.logger.error(
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    response.status(normalizado.statusCode).json(normalizado);
  }

  private normalizar(exception: unknown): CuerpoErrorNormalizado {
    if (exception instanceof ApiException) {
      const body = exception.getResponse() as { code: string; message: string };
      return {
        statusCode: exception.getStatus(),
        code: body.code,
        message: body.message,
      };
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();

      let message: string;
      if (typeof body === 'string') {
        message = body;
      } else if (body && typeof body === 'object' && 'message' in body) {
        const raw = (body as { message: unknown }).message;
        message = Array.isArray(raw) ? raw.join('. ') : String(raw);
      } else {
        message = exception.message;
      }

      return {
        statusCode: status,
        code: status >= 500 ? ErrorCodes.ERROR_INESPERADO : `HTTP_${status}`,
        message: status >= 500 ? MENSAJE_5XX : message,
      };
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      code: ErrorCodes.ERROR_INESPERADO,
      message: MENSAJE_5XX,
    };
  }
}
