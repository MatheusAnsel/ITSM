import { EventEmitter } from 'node:events';
import type { Request, Response } from 'express';
import { accessLogMiddleware } from './access-log.middleware';

function run(opts: {
  url: string;
  method?: string;
  status: number;
  headers?: Record<string, string>;
  user?: { id: string };
}) {
  const calls: Array<{ level: 'log' | 'warn' | 'error'; entry: Record<string, unknown> }> = [];
  const logger = {
    log: (entry: Record<string, unknown>) => calls.push({ level: 'log', entry }),
    warn: (entry: Record<string, unknown>) => calls.push({ level: 'warn', entry }),
    error: (entry: Record<string, unknown>) => calls.push({ level: 'error', entry }),
  };
  const req = {
    originalUrl: opts.url,
    method: opts.method ?? 'GET',
    headers: opts.headers ?? {},
    user: opts.user,
  } as unknown as Request;
  const res = Object.assign(new EventEmitter(), { statusCode: opts.status }) as unknown as Response;
  const next = jest.fn();
  accessLogMiddleware(logger)(req, res, next);
  (res as unknown as EventEmitter).emit('finish');
  return { calls, next };
}

describe('accessLogMiddleware', () => {
  it('registra método, caminho, status, duração e requestId ao terminar a resposta', () => {
    const { calls, next } = run({
      url: '/api/tickets',
      status: 200,
      headers: { 'x-request-id': 'req-12345678' },
    });
    expect(next).toHaveBeenCalledTimes(1);
    expect(calls).toHaveLength(1);
    expect(calls[0].level).toBe('log');
    expect(calls[0].entry).toMatchObject({
      message: 'request',
      method: 'GET',
      path: '/api/tickets',
      status: 200,
      requestId: 'req-12345678',
    });
    expect(typeof calls[0].entry.durationMs).toBe('number');
  });

  it('não grava a query string (pode ter termos de busca)', () => {
    const { calls } = run({ url: '/api/tickets?q=senha+do+joao&status=OPEN', status: 200 });
    expect(calls[0].entry.path).toBe('/api/tickets');
    expect(JSON.stringify(calls[0].entry)).not.toContain('joao');
  });

  it('inclui o usuário autenticado, quando houver', () => {
    const { calls } = run({ url: '/api/tickets', status: 200, user: { id: 'u-1' } });
    expect(calls[0].entry.userId).toBe('u-1');
    const anon = run({ url: '/api/auth/login', method: 'POST', status: 401 });
    expect(anon.calls[0].entry).not.toHaveProperty('userId');
  });

  it('usa aviso para 4xx e erro para 5xx', () => {
    expect(run({ url: '/api/tickets/x', status: 404 }).calls[0].level).toBe('warn');
    expect(run({ url: '/api/tickets', status: 500 }).calls[0].level).toBe('error');
  });

  it('não registra a verificação de saúde', () => {
    expect(run({ url: '/api/health', status: 200 }).calls).toHaveLength(0);
    expect(run({ url: '/api/health?x=1', status: 200 }).calls).toHaveLength(0);
  });

  it('nunca grava cabeçalhos de autenticação nem cookies', () => {
    const { calls } = run({
      url: '/api/auth/me',
      status: 200,
      headers: { authorization: 'Bearer segredo.jwt.token', cookie: 'refresh=abc' },
    });
    const text = JSON.stringify(calls[0].entry);
    expect(text).not.toContain('segredo.jwt.token');
    expect(text).not.toContain('refresh=abc');
  });
});
