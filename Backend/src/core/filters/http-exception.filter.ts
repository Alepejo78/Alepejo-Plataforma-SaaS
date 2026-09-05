import {
    ArgumentsHost,
    Catch,
    ExceptionFilter,
    HttpException,
    HttpStatus,
    Logger,
  } from '@nestjs/common';
  import { Request, Response } from 'express';

  @Catch()
  export class HttpExceptionFilter implements ExceptionFilter {
    private readonly logger = new Logger('ExceptionFilter');

    catch(exception: unknown, host: ArgumentsHost): void {
      const ctx = host.switchToHttp();

      const response = ctx.getResponse<Response>();
      const request = ctx.getRequest<Request>();

      const status =
        exception instanceof HttpException
          ? exception.getStatus()
          : HttpStatus.INTERNAL_SERVER_ERROR;

      if (status >= 500) {
        this.logger.error(
          `${request.method} ${request.url} -> ${status}`,
          exception instanceof Error ? exception.stack : String(exception),
        );
      }

      let message: string | string[] = 'Erro interno do servidor';
  
      if (exception instanceof HttpException) {
        const exceptionResponse = exception.getResponse();
  
        if (typeof exceptionResponse === 'string') {
          message = exceptionResponse;
        } else if (
          typeof exceptionResponse === 'object' &&
          exceptionResponse !== null
        ) {
          const res = exceptionResponse as Record<string, any>;
          message = res.message ?? message;
        }
      }
  
      response.status(status).json({
        success: false,
        timestamp: new Date().toISOString(),
        statusCode: status,
        path: request.url,
        method: request.method,
        message,
      });
    }
  }