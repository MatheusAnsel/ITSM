import 'reflect-metadata';
import type { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import request from 'supertest';

// O env é lido quando os módulos são importados, então precisa existir antes.
process.env.DATABASE_URL = 'postgresql://x:x@localhost:5432/x';
process.env.CORS_ORIGINS = 'http://localhost:3000';
process.env.JWT_ACCESS_SECRET = 'segredo-de-teste-com-mais-de-32-caracteres';

const UUID = '3f1c2a54-0b0e-4a53-9c58-2d6b3a1f7e10';

describe('API HTTP (AppModule inteiro, Prisma simulado)', () => {
  let app: INestApplication;
  let jwt: { signAsync: (p: object) => Promise<string> };
  const prisma = {
    onModuleInit: async () => undefined,
    onModuleDestroy: async () => undefined,
    $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
    ticket: { findUnique: jest.fn().mockResolvedValue(null) },
    category: { findMany: jest.fn().mockResolvedValue([]) },
    user: { findUnique: jest.fn().mockResolvedValue(null) },
  };

  beforeAll(async () => {
    const { Test } = await import('@nestjs/testing');
    const { JwtService } = await import('@nestjs/jwt');
    const { AppModule } = await import('./app.module');
    const { PrismaService } = await import('./prisma/prisma.service');
    const { AllExceptionsFilter } = await import('./common/http-exception.filter');

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .compile();
    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();
    jwt = app.get(JwtService);
  });

  afterAll(async () => {
    await app.close();
  });

  const token = (role: string) => jwt.signAsync({ sub: UUID, role });
  const http = () => request(app.getHttpServer());

  it('health é público', async () => {
    await http().get('/health').expect(200);
  });

  it('rotas protegidas respondem 401 sem token', async () => {
    for (const path of ['/tickets', '/users', '/categories', '/auth/me', `/tickets/${UUID}`]) {
      await http().get(path).expect(401);
    }
  });

  it('token adulterado responde 401', async () => {
    await http().get('/tickets').set('Authorization', 'Bearer abc.def.ghi').expect(401);
  });

  it('solicitante não acessa rotas administrativas nem de atendimento (403)', async () => {
    const t = await token('REQUESTER');
    await http().get('/users').set('Authorization', `Bearer ${t}`).expect(403);
    await http().post('/categories').set('Authorization', `Bearer ${t}`).send({ name: 'Nova' }).expect(403);
    await http().patch(`/tickets/${UUID}`).set('Authorization', `Bearer ${t}`).send({ title: 'Outro' }).expect(403);
    await http().post(`/tickets/${UUID}/assign`).set('Authorization', `Bearer ${t}`).send({ assigneeId: UUID }).expect(403);
  });

  it('atendente não acessa a gestão de usuários', async () => {
    await http().get('/users').set('Authorization', `Bearer ${await token('AGENT')}`).expect(403);
  });

  it('valida a entrada: campos extras, tipos e UUID malformado', async () => {
    const t = await token('REQUESTER');
    const auth = { Authorization: `Bearer ${t}` };
    await http().post('/tickets').set(auth).send({ title: 'ab', description: 'x', categoryId: 'nao-uuid' }).expect(400);
    await http().post('/tickets').set(auth).send({ title: 'Titulo ok', description: 'Descricao', categoryId: UUID, role: 'ADMIN' }).expect(400);
    await http().get('/tickets/nao-e-uuid').set(auth).expect(400);
    await http().get('/tickets?perPage=1000').set(auth).expect(400);
    await http().get('/tickets?status=INVALIDO').set(auth).expect(400);
  });

  it('login rejeita corpo inválido e não vaza se o e-mail existe', async () => {
    await http().post('/auth/login').send({ email: 'x' }).expect(400);
    const res = await http().post('/auth/login').send({ email: 'ninguem@x.com', password: 'qualquer-coisa' }).expect(401);
    expect(res.body.message).toBe('E-mail ou senha inválidos');
  });

  it('chamado inexistente responde 404 para a equipe', async () => {
    await http().get(`/tickets/${UUID}`).set('Authorization', `Bearer ${await token('AGENT')}`).expect(404);
  });

  it('categorias ficam disponíveis para qualquer usuário autenticado', async () => {
    await http().get('/categories').set('Authorization', `Bearer ${await token('REQUESTER')}`).expect(200);
  });
});
