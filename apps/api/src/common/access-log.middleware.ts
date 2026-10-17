import type { NextFunction, Request, Response } from 'express';
import { REQUEST_ID_HEADER } from './request-id.middleware';

interface AccessLogger {
  log(message: Record<string, unknown>): void;
  warn(message: Record<string, unknown>): void;
  error(message: Record<string, unknown>): void;
}

// A verificação de saúde é chamada de poucos em poucos segundos pelo balanceador; registrá-la só faria ruído.
const SKIPPED_PATHS = new Set(['/api/health']);

// Registra uma linha por requisição ao terminar a resposta: método, caminho, status, duração, requestId
// e o usuário autenticado. O caminho sai sem query string (que pode ter termos de busca), e nenhum
// cabeçalho, cookie ou corpo é registrado.
export function accessLogMiddleware(logger: AccessLogger) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const started = process.hrtime.bigint();
    res.on('finish', () => {
      const path = (req.originalUrl ?? req.url).split('?')[0];
      if (SKIPPED_PATHS.has(path)) return;
      const user = (req as Request & { user?: { id?: string } }).user;
      const entry: Record<string, unknown> = {
        message: 'request',
        method: req.method,
        path,
        status: res.statusCode,
        durationMs: Math.round(Number(process.hrtime.bigint() - started) / 1e4) / 100,
        requestId: String(req.headers[REQUEST_ID_HEADER] ?? ''),
      };
      if (user?.id) entry.userId = user.id;
      if (res.statusCode >= 500) logger.error(entry);
      else if (res.statusCode >= 400) logger.warn(entry);
      else logger.log(entry);
    });
    next();
  };
}
