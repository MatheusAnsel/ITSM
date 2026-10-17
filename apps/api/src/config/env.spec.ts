import { resolveLogFormat, validateEnv } from './env';

const base = {
  DATABASE_URL: 'postgresql://u:p@localhost:5432/itsm',
  CORS_ORIGINS: 'http://localhost:3000, http://localhost:3002',
  JWT_ACCESS_SECRET: 'x'.repeat(32),
} as NodeJS.ProcessEnv;

describe('validateEnv', () => {
  it('aplica valores padrão e normaliza CORS_ORIGINS', () => {
    const env = validateEnv(base);
    expect(env.PORT).toBe(3001);
    expect(env.REFRESH_TTL_DAYS).toBe(7);
    expect(env.SWAGGER_ENABLED).toBe(false);
    expect(env.CORS_ORIGINS).toEqual(['http://localhost:3000', 'http://localhost:3002']);
  });

  it('TRUST_PROXY e DEMO_MODE vêm desligados por padrão e aceitam valores explícitos', () => {
    const padrao = validateEnv(base);
    expect(padrao.TRUST_PROXY).toBe(0);
    expect(padrao.DEMO_MODE).toBe(false);
    const ligado = validateEnv({ ...base, TRUST_PROXY: '1', DEMO_MODE: 'true' });
    expect(ligado.TRUST_PROXY).toBe(1);
    expect(ligado.DEMO_MODE).toBe(true);
    expect(() => validateEnv({ ...base, TRUST_PROXY: '-1' })).toThrow(/TRUST_PROXY/);
  });

  it('LOG_REQUESTS vem ligado e o formato do log depende do ambiente', () => {
    const dev = validateEnv(base);
    expect(dev.LOG_REQUESTS).toBe(true);
    expect(resolveLogFormat(dev)).toBe('pretty');
    const prod = validateEnv({ ...base, NODE_ENV: 'production', COOKIE_SECURE: 'true' });
    expect(resolveLogFormat(prod)).toBe('json');
    expect(resolveLogFormat(validateEnv({ ...base, LOG_FORMAT: 'json' }))).toBe('json');
    expect(validateEnv({ ...base, LOG_REQUESTS: 'false' }).LOG_REQUESTS).toBe(false);
    expect(() => validateEnv({ ...base, LOG_FORMAT: 'xml' })).toThrow(/LOG_FORMAT/);
  });

  it('rejeita segredo JWT curto', () => {
    expect(() => validateEnv({ ...base, JWT_ACCESS_SECRET: 'curto' })).toThrow(/JWT_ACCESS_SECRET/);
  });

  it('rejeita configuração incompleta', () => {
    expect(() => validateEnv({} as NodeJS.ProcessEnv)).toThrow(/DATABASE_URL/);
  });

  it('exige cookie seguro em produção', () => {
    expect(() => validateEnv({ ...base, NODE_ENV: 'production', COOKIE_SECURE: 'false' })).toThrow(
      /COOKIE_SECURE/,
    );
    expect(
      validateEnv({ ...base, NODE_ENV: 'production', COOKIE_SECURE: 'true' }).COOKIE_SECURE,
    ).toBe(true);
  });
});
