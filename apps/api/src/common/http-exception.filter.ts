import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { REQUEST_ID_HEADER } from './request-id.middleware';

interface ErrorBody {
  statusCode: number;
  message: string;
  errors?: Record<string, string[]>;
  requestId: string;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('HTTP');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<Request>();
    const res = ctx.getResponse<Response>();
    const requestId = String(req.headers[REQUEST_ID_HEADER] ?? '');

    const body: ErrorBody = {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Erro interno do servidor',
      requestId,
    };

    if (exception instanceof HttpException) {
      body.statusCode = exception.getStatus();
      const response = exception.getResponse();
      if (typeof response === 'string') {
        body.message = response;
      } else if (response && typeof response === 'object') {
        const payload = response as { message?: string | string[] };
        if (Array.isArray(payload.message)) {
          body.message = 'Dados inválidos';
          body.errors = groupByField(payload.message);
        } else if (payload.message) {
          body.message = payload.message;
        }
      }
    } else {
      // Detalhes só no log do servidor; nunca na resposta.
      const detail = exception instanceof Error ? exception.stack : String(exception);
      this.logger.error(`[${requestId}] ${detail}`);
    }

    res.status(body.statusCode).json(body);
  }
}

// Mensagens do class-validator começam com o nome do campo ("email must be ...").
function groupByField(messages: string[]): Record<string, string[]> {
  const grouped: Record<string, string[]> = {};
  for (const message of messages) {
    const field = message.split(' ')[0] || 'geral';
    (grouped[field] ??= []).push(message);
  }
  return grouped;
}
