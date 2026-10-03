import { validateEnv } from './env';

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

  it('rejeita segredo JWT curto', () => {
    expect(() => validateEnv({ ...base, JWT_ACCESS_SECRET: 'curto' })).toThrow(/JWT_ACCESS_SECRET/);
  });

  it('rejeita configuração incompleta', () => {
    expect(() => validateEnv({} as NodeJS.ProcessEnv)).toThrow(/DATABASE_URL/);
  });

  it('exige cookie seguro em produção', () => {
    expect(() =>
      validateEnv({ ...base, NODE_ENV: 'production', COOKIE_SECURE: 'false' }),
    ).toThrow(/COOKIE_SECURE/);
    expect(
      validateEnv({ ...base, NODE_ENV: 'production', COOKIE_SECURE: 'true' }).COOKIE_SECURE,
    ).toBe(true);
  });
});
