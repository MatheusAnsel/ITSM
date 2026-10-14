import 'reflect-metadata';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';

process.env.NODE_ENV = 'test';
process.env.CORS_ORIGINS = 'http://localhost:3000';
process.env.JWT_ACCESS_SECRET ??= 'segredo-e2e-com-mais-de-32-caracteres-1234';
process.env.AUTO_CLOSE_INTERVAL_MINUTES = '0';
process.env.SWAGGER_ENABLED = 'false';

describe('Limite de tentativas no login (real, sem simulação)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const { Test } = await import('@nestjs/testing');
    const { AppModule } = await import('../src/app.module');
    const { configureApp } = await import('../src/app.setup');
    const { validateEnv } = await import('../src/config/env');
    app = (await Test.createTestingModule({ imports: [AppModule] }).compile()).createNestApplication();
    configureApp(app, validateEnv());
    await app.init();
  });

  afterAll(() => app.close());

  it('bloqueia com 429 após 5 tentativas por minuto e informa quando tentar de novo', async () => {
    const attempt = () => request(app.getHttpServer()).post('/api/auth/login').send({ email: 'forca.bruta@e2e.itsm.local', password: 'qualquer-senha-1' });
    for (let i = 0; i < 5; i++) await attempt().expect(401);
    const blocked = await attempt().expect(429);
    expect(Number(blocked.headers['retry-after'])).toBeGreaterThan(0);
  });
});
