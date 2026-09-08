import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorCodes } from '../constants/error-codes';

export class ApiException extends HttpException {
  constructor(status: HttpStatus, code: ErrorCodes | string, message: string) {
    super({ statusCode: status, code, message }, status);
  }
}

export const apiError = (
  status: HttpStatus,
  code: ErrorCodes | string,
  message: string,
): ApiException => new ApiException(status, code, message);
