import { JsonLogger } from './json-logger';

function capture() {
  const lines: string[] = [];
  const logger = new JsonLogger((line) => lines.push(line));
  const last = () => JSON.parse(lines[lines.length - 1]) as Record<string, unknown>;
  return { logger, lines, last };
}

describe('JsonLogger', () => {
  it('escreve uma linha de JSON por evento, com hora, nível e mensagem', () => {
    const { logger, lines, last } = capture();
    logger.log('API no ar', 'Bootstrap');
    expect(lines).toHaveLength(1);
    expect(last()).toMatchObject({ level: 'info', message: 'API no ar', context: 'Bootstrap' });
    expect(new Date(last().time as string).toString()).not.toBe('Invalid Date');
  });

  it('mapeia os níveis do Nest', () => {
    const { logger, last } = capture();
    logger.warn('a');
    expect(last().level).toBe('warn');
    logger.error('b');
    expect(last().level).toBe('error');
    logger.debug('c');
    expect(last().level).toBe('debug');
    logger.fatal('d');
    expect(last().level).toBe('fatal');
  });

  it('transforma o objeto de log em campos da linha', () => {
    const { logger, last } = capture();
    logger.log({ message: 'request', method: 'GET', path: '/api/tickets', status: 200 }, 'HTTP');
    expect(last()).toMatchObject({
      message: 'request',
      method: 'GET',
      path: '/api/tickets',
      status: 200,
      context: 'HTTP',
    });
  });

  it('em erro, trata o penúltimo texto como stack e o último como contexto', () => {
    const { logger, last } = capture();
    logger.error('falhou', 'Error: falhou\n    at x', 'HTTP');
    expect(last()).toMatchObject({
      message: 'falhou',
      stack: 'Error: falhou\n    at x',
      context: 'HTTP',
    });
  });

  it('aceita uma instância de Error', () => {
    const { logger, last } = capture();
    logger.error(new Error('boom'), 'Jobs');
    expect(last().message).toBe('boom');
    expect(String(last().stack)).toContain('Error: boom');
    expect(last().context).toBe('Jobs');
  });

  it('mantém o stack passado dentro do objeto de log', () => {
    const { logger, last } = capture();
    logger.error({ message: 'Erro não tratado', requestId: 'abc', stack: 'Error: x' }, 'HTTP');
    expect(last()).toMatchObject({
      message: 'Erro não tratado',
      requestId: 'abc',
      stack: 'Error: x',
    });
  });

  it('nunca grava campos sensíveis, mesmo que venham no objeto', () => {
    const { logger, lines, last } = capture();
    logger.log({
      message: 'login',
      password: 'segredo-123',
      accessToken: 'abc.def.ghi',
      Authorization: 'Bearer xyz',
      cookie: 'refresh=1',
      passwordHash: '$2a$10$x',
      email: 'ana@itsm.local',
    });
    expect(last()).toMatchObject({
      password: '[redacted]',
      accessToken: '[redacted]',
      Authorization: '[redacted]',
    });
    expect(last()).toMatchObject({
      cookie: '[redacted]',
      passwordHash: '[redacted]',
      email: 'ana@itsm.local',
    });
    expect(lines[0]).not.toContain('segredo-123');
    expect(lines[0]).not.toContain('abc.def.ghi');
  });

  it('não deixa um campo do objeto sobrescrever o nível nem a hora', () => {
    const { logger, last } = capture();
    logger.log({ message: 'x', level: 'fake', time: 'ontem' });
    expect(last().level).toBe('info');
    expect(last().time).not.toBe('ontem');
  });
});
