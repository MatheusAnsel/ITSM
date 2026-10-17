import type { LoggerService } from '@nestjs/common';

type Level = 'log' | 'error' | 'warn' | 'debug' | 'verbose' | 'fatal';

const LEVEL_NAME: Record<Level, string> = {
  log: 'info',
  error: 'error',
  warn: 'warn',
  debug: 'debug',
  verbose: 'verbose',
  fatal: 'fatal',
};

// Campos que nunca devem chegar ao log, mesmo que alguém passe o objeto errado por engano.
const SENSITIVE_KEY = /pass(word)?|token|secret|authorization|cookie|hash/i;

function redact(fields: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields)) {
    out[key] = SENSITIVE_KEY.test(key) ? '[redacted]' : value;
  }
  return out;
}

// Logger do Nest que escreve uma linha de JSON por evento (padrão de plataformas como Render, Datadog
// e CloudWatch: cada linha é um registro que pode ser filtrado por campo, como requestId ou status).
// Convenção do Nest: o último parâmetro textual é o contexto; em `error`, o anterior é o stack.
export class JsonLogger implements LoggerService {
  constructor(
    private readonly write: (line: string) => void = (line) => process.stdout.write(`${line}\n`),
  ) {}

  log(message: unknown, ...params: unknown[]): void {
    this.emit('log', message, params);
  }
  error(message: unknown, ...params: unknown[]): void {
    this.emit('error', message, params);
  }
  warn(message: unknown, ...params: unknown[]): void {
    this.emit('warn', message, params);
  }
  debug(message: unknown, ...params: unknown[]): void {
    this.emit('debug', message, params);
  }
  verbose(message: unknown, ...params: unknown[]): void {
    this.emit('verbose', message, params);
  }
  fatal(message: unknown, ...params: unknown[]): void {
    this.emit('fatal', message, params);
  }

  private emit(level: Level, message: unknown, params: unknown[]): void {
    const rest = [...params];
    let context: string | undefined;
    let stack: string | undefined;
    if (typeof rest[rest.length - 1] === 'string') context = rest.pop() as string;
    if ((level === 'error' || level === 'fatal') && typeof rest[rest.length - 1] === 'string') {
      stack = rest.pop() as string;
    }

    const time = new Date().toISOString();
    const record: Record<string, unknown> = { time, level: LEVEL_NAME[level] };
    if (context) record.context = context;

    if (message instanceof Error) {
      record.message = message.message;
      record.stack = stack ?? message.stack;
    } else if (message !== null && typeof message === 'object') {
      const { message: text, ...fields } = message as Record<string, unknown>;
      record.message = typeof text === 'string' ? text : '';
      Object.assign(record, redact(fields));
      if (stack && record.stack === undefined) record.stack = stack;
    } else {
      record.message = String(message);
      if (stack) record.stack = stack;
    }

    // Hora e nível são do logger: um campo com o mesmo nome no objeto de log não pode sobrescrevê-los.
    record.time = time;
    record.level = LEVEL_NAME[level];
    this.write(JSON.stringify(record));
  }
}
