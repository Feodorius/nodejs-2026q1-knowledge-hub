import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { AppError } from '../errors';

const HTTP_STATUS_NAMES: Record<number, string> = {
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  409: 'Conflict',
  422: 'Unprocessable Entity',
  429: 'Too Many Requests',
  500: 'Internal Server Error',
};

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let statusCode: number;
    let error: string;
    let message: string;

    if (exception instanceof AppError) {
      statusCode = exception.statusCode;
      message = exception.message;
      error = HTTP_STATUS_NAMES[statusCode] ?? 'Error';
      this.logger.error(
        `${exception.name}: ${exception.message}`,
        exception.stack,
        AllExceptionsFilter.name,
      );
    } else if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'string') {
        message = res;
        error = HTTP_STATUS_NAMES[statusCode] ?? 'Error';
      } else {
        const resObj = res as Record<string, any>;
        const rawMessage = resObj.message;
        message = Array.isArray(rawMessage)
          ? rawMessage.join(', ')
          : (rawMessage ?? exception.message);
        error = resObj.error ?? HTTP_STATUS_NAMES[statusCode] ?? 'Error';
      }
      this.logger.error(
        `HttpException [${statusCode}]: ${message}`,
        exception.stack,
        AllExceptionsFilter.name,
      );
    } else {
      statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
      error = 'Internal Server Error';
      message = 'An unexpected error occurred';
      const err = exception as Error;
      this.logger.error(
        `Unhandled Error: ${err?.message ?? String(exception)}`,
        err?.stack,
        AllExceptionsFilter.name,
      );
    }

    response.status(statusCode).json({ statusCode, error, message });
  }
}
