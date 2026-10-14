import 'reflect-metadata';
import type { INestApplication } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import { rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import request from 'supertest';

// Precisa existir antes de importar a aplicação (o env é validado ao carregar os módulos).
const uploadDir = join(tmpdir(), `itsm-e2e-${randomUUID()}`);
process.env.NODE_ENV = 'test';
process.env.CORS_ORIGINS = 'http://localhost:3000';
process.env.JWT_ACCESS_SECRET ??= 'segredo-e2e-com-mais-de-32-caracteres-1234';
process.env.UPLOAD_DIR = uploadDir;
process.env.AUTO_CLOSE_INTERVAL_MINUTES = '0';
// O limite de requisições tem teste próprio (throttle.e2e-spec.ts); aqui atrapalharia os logins repetidos.
process.env.RATE_LIMIT_ENABLED = 'false';
process.env.SWAGGER_ENABLED = 'false';

const PASSWORD = 'Senha-Forte-123';
const run = randomUUID().slice(0, 8);
const email = (who: string) => `${who}.${run}@e2e.itsm.local`;
const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3, 4, 5, 6]);

describe('Fluxo completo da API contra PostgreSQL real', () => {
  let app: INestApplication;
  const http = () => request(app.getHttpServer());

  const tokens: Record<string, string> = {};
  const ids: Record<string, string> = {};
  let categoryId: string;
  let ticketId: string;

  const auth = (who: string) => ({ Authorization: `Bearer ${tokens[who]}` });
  const login = async (who: string) => {
    const res = await http().post('/api/auth/login').send({ email: email(who), password: PASSWORD }).expect(200);
    tokens[who] = res.body.accessToken;
    ids[who] = res.body.user.id;
  };

  beforeAll(async () => {
    const { Test } = await import('@nestjs/testing');
    const { AppModule } = await import('../src/app.module');
    const { configureApp } = await import('../src/app.setup');
    const { validateEnv } = await import('../src/config/env');
    const { PrismaService } = await import('../src/prisma/prisma.service');

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app, validateEnv());
    await app.init();

    // O primeiro administrador não pode ser criado pela API (RN-01); entra como o seed faria.
    const prisma = app.get(PrismaService);
    await prisma.user.create({
      data: { name: 'Admin E2E', email: email('admin'), passwordHash: await bcrypt.hash(PASSWORD, 4), role: 'ADMIN' },
    });
    await login('admin');
  });

  afterAll(async () => {
    await app.close();
    await rm(uploadDir, { recursive: true, force: true });
  });

  describe('autenticação', () => {
    it('cadastro cria solicitante, devolve token e cookie httpOnly restrito a /api/auth', async () => {
      const res = await http().post('/api/auth/register').send({ name: 'Rita Solicitante', email: email('rita'), password: PASSWORD }).expect(201);
      expect(res.body.user).toMatchObject({ email: email('rita'), role: 'REQUESTER' });
      expect(res.body.user.passwordHash).toBeUndefined();
      const cookie = (res.headers['set-cookie'] as unknown as string[]).find((c) => c.startsWith('itsm_refresh='))!;
      expect(cookie).toMatch(/HttpOnly/i);
      expect(cookie).toMatch(/Path=\/api\/auth/);
      expect(cookie).toMatch(/SameSite=Strict/i);
      tokens.rita = res.body.accessToken;
      ids.rita = res.body.user.id;
    });

    it('rejeita e-mail repetido e senha curta', async () => {
      await http().post('/api/auth/register').send({ name: 'Outra', email: email('rita'), password: PASSWORD }).expect(409);
      await http().post('/api/auth/register').send({ name: 'Outra', email: email('curta'), password: 'curta' }).expect(422);
    });

    it('login errado responde igual para e-mail inexistente e senha incorreta', async () => {
      const a = await http().post('/api/auth/login').send({ email: email('rita'), password: 'errada-errada-1' }).expect(401);
      const b = await http().post('/api/auth/login').send({ email: email('naoexiste'), password: 'errada-errada-1' }).expect(401);
      expect(a.body.message).toBe(b.body.message);
      expect(a.body.requestId).toBeTruthy();
    });

    it('refresh rotaciona o token e o antigo deixa de valer', async () => {
      const first = await http().post('/api/auth/login').send({ email: email('rita'), password: PASSWORD }).expect(200);
      const cookie1 = (first.headers['set-cookie'] as unknown as string[])[0].split(';')[0];
      const second = await http().post('/api/auth/refresh').set('Cookie', cookie1).expect(200);
      expect(second.body.accessToken).toBeTruthy();
      const cookie2 = (second.headers['set-cookie'] as unknown as string[])[0].split(';')[0];
      expect(cookie2).not.toBe(cookie1);
      await http().post('/api/auth/refresh').set('Cookie', cookie1).expect(401);
      // A reutilização do token antigo derruba a família inteira.
      await http().post('/api/auth/refresh').set('Cookie', cookie2).expect(401);
    });

    it('/auth/me exige token e devolve o usuário', async () => {
      await http().get('/api/auth/me').expect(401);
      const res = await http().get('/api/auth/me').set(auth('rita')).expect(200);
      expect(res.body.email).toBe(email('rita'));
    });
  });

  describe('administração', () => {
    it('admin cria categoria, atendente e gestor; solicitante não pode', async () => {
      const cat = await http().post('/api/categories').set(auth('admin')).send({ name: `Cat ${run}`, description: 'e2e' }).expect(201);
      categoryId = cat.body.id;
      await http().post('/api/categories').set(auth('rita')).send({ name: 'Nao pode' }).expect(403);

      for (const [who, role] of [['agente', 'AGENT'], ['gestor', 'MANAGER']] as const) {
        await http().post('/api/users').set(auth('admin')).send({ name: `${who} e2e`, email: email(who), password: PASSWORD, role }).expect(201);
        await login(who);
      }
      await http().get('/api/users').set(auth('agente')).expect(403);
    });

    it('administrador não consegue rebaixar nem desativar a si mesmo', async () => {
      await http().patch(`/api/users/${ids.admin}`).set(auth('admin')).send({ active: false }).expect(422);
      await http().patch(`/api/users/${ids.admin}`).set(auth('admin')).send({ role: 'AGENT' }).expect(422);
    });

    it('políticas de SLA: lista as 4 prioridades e valida a edição', async () => {
      const list = await http().get('/api/sla-policies').set(auth('agente')).expect(200);
      expect(list.body.map((p: { priority: string }) => p.priority)).toEqual(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']);
      await http().put('/api/sla-policies/LOW').set(auth('agente')).send({ firstResponseMinutes: 10, resolutionMinutes: 20 }).expect(403);
      await http().put('/api/sla-policies/LOW').set(auth('admin')).send({ firstResponseMinutes: 600, resolutionMinutes: 100 }).expect(422);
    });
  });

  describe('chamados', () => {
    it('solicitante abre um chamado com prazos de SLA calculados', async () => {
      const res = await http()
        .post('/api/tickets')
        .set(auth('rita'))
        .send({ title: 'Notebook não liga', description: 'Tela preta desde ontem', categoryId, priority: 'HIGH' })
        .expect(201);
      ticketId = res.body.id;
      expect(res.body).toMatchObject({ status: 'OPEN', priority: 'HIGH', number: expect.any(Number) });
      expect(new Date(res.body.resolutionDueAt).getTime()).toBeGreaterThan(new Date(res.body.responseDueAt).getTime());
      expect(res.body.allowedTransitions).toEqual(['CANCELLED']);
    });

    it('solicitante só enxerga os próprios chamados; outro solicitante recebe 404', async () => {
      const other = await http().post('/api/auth/register').send({ name: 'Otávio', email: email('otavio'), password: PASSWORD }).expect(201);
      tokens.otavio = other.body.accessToken;
      const mine = await http().get('/api/tickets').set(auth('rita')).expect(200);
      expect(mine.body.items.map((t: { id: string }) => t.id)).toContain(ticketId);
      const theirs = await http().get('/api/tickets').set(auth('otavio')).expect(200);
      expect(theirs.body.items).toHaveLength(0);
      await http().get(`/api/tickets/${ticketId}`).set(auth('otavio')).expect(404);
      await http().get(`/api/tickets/${ticketId}/comments`).set(auth('otavio')).expect(404);
    });

    it('filtros e paginação funcionam no banco', async () => {
      const byStatus = await http().get('/api/tickets?status=OPEN&perPage=5&sort=-number').set(auth('agente')).expect(200);
      expect(byStatus.body).toMatchObject({ page: 1, perPage: 5 });
      expect(byStatus.body.items.every((t: { status: string }) => t.status === 'OPEN')).toBe(true);
      const search = await http().get(`/api/tickets?q=${encodeURIComponent('Notebook não liga')}`).set(auth('agente')).expect(200);
      expect(search.body.items.some((t: { id: string }) => t.id === ticketId)).toBe(true);
      const none = await http().get('/api/tickets?q=zzzz-inexistente-zzzz').set(auth('agente')).expect(200);
      expect(none.body.total).toBe(0);
    });

    it('atendente assume o chamado: vai para atendimento e o histórico registra', async () => {
      const res = await http().post(`/api/tickets/${ticketId}/assign`).set(auth('agente')).send({ assigneeId: ids.agente }).expect(200);
      expect(res.body.status).toBe('IN_PROGRESS');
      expect(res.body.assignee.id).toBe(ids.agente);
      const hist = await http().get(`/api/tickets/${ticketId}/history`).set(auth('rita')).expect(200);
      expect(hist.body.map((h: { action: string }) => h.action)).toEqual(expect.arrayContaining(['CREATED', 'ASSIGNEE_CHANGED', 'STATUS_CHANGED']));
    });

    it('atendente não atribui a outra pessoa; gestor pode', async () => {
      await http().post(`/api/tickets/${ticketId}/assign`).set(auth('agente')).send({ assigneeId: ids.gestor }).expect(403);
      await http().post(`/api/tickets/${ticketId}/assign`).set(auth('gestor')).send({ assigneeId: ids.gestor }).expect(200);
      await http().post(`/api/tickets/${ticketId}/assign`).set(auth('gestor')).send({ assigneeId: ids.agente }).expect(200);
      await http().post(`/api/tickets/${ticketId}/assign`).set(auth('gestor')).send({ assigneeId: ids.rita }).expect(422);
    });

    it('comentário interno nunca chega ao solicitante e não conta como primeira resposta', async () => {
      // A 1ª resposta é pública (comentário) ou o início do atendimento (RN-06); nota interna não conta.
      const fresh = await http().post('/api/tickets').set(auth('rita')).send({ title: 'Teclado falhando', description: 'Teclas travam', categoryId }).expect(201);
      const id = fresh.body.id as string;
      await http().post(`/api/tickets/${id}/comments`).set(auth('rita')).send({ body: 'tentando', internal: true }).expect(403);
      await http().post(`/api/tickets/${id}/comments`).set(auth('agente')).send({ body: 'Nota: verificar bateria', internal: true }).expect(201);
      let t = await http().get(`/api/tickets/${id}`).set(auth('agente')).expect(200);
      expect(t.body.firstRespondedAt).toBeNull();
      await http().post(`/api/tickets/${id}/comments`).set(auth('agente')).send({ body: 'Pode me dizer se o LED acende?' }).expect(201);
      t = await http().get(`/api/tickets/${id}`).set(auth('agente')).expect(200);
      expect(t.body.firstRespondedAt).not.toBeNull();

      const asRequester = await http().get(`/api/tickets/${id}/comments`).set(auth('rita')).expect(200);
      expect(asRequester.body.map((c: { body: string }) => c.body)).toEqual(['Pode me dizer se o LED acende?']);
      const asAgent = await http().get(`/api/tickets/${id}/comments`).set(auth('agente')).expect(200);
      expect(asAgent.body).toHaveLength(2);
    });

    it('assumir o chamado conta como primeira resposta', async () => {
      const t = await http().get(`/api/tickets/${ticketId}`).set(auth('agente')).expect(200);
      expect(t.body.firstRespondedAt).not.toBeNull();
    });

    it('anexos: sobe PNG, baixa idêntico, bloqueia tipo falso e acesso de terceiros', async () => {
      const up = await http().post(`/api/tickets/${ticketId}/attachments`).set(auth('rita')).attach('file', png, 'foto da tela.png').expect(201);
      expect(up.body).toMatchObject({ filename: 'foto da tela.png', mimeType: 'image/png', size: png.length });

      const dl = await http()
        .get(`/api/tickets/${ticketId}/attachments/${up.body.id}`)
        .set(auth('agente'))
        .buffer(true)
        .parse((res, cb) => {
          const chunks: Buffer[] = [];
          res.on('data', (c: Buffer) => chunks.push(c));
          res.on('end', () => cb(null, Buffer.concat(chunks)));
        })
        .expect(200);
      expect(dl.headers['content-disposition']).toContain('attachment');
      expect(dl.headers['x-content-type-options']).toBe('nosniff');
      expect((dl.body as Buffer).equals(png)).toBe(true);

      await http().post(`/api/tickets/${ticketId}/attachments`).set(auth('rita')).attach('file', Buffer.from('MZ\x90\x00'), 'virus.png').expect(422);
      await http().post(`/api/tickets/${ticketId}/attachments`).set(auth('rita')).attach('file', Buffer.alloc(6 * 1024 * 1024, 65), 'grande.txt').expect(413);
      await http().get(`/api/tickets/${ticketId}/attachments/${up.body.id}`).set(auth('otavio')).expect(404);
      await http().get(`/api/tickets/${ticketId}/attachments/${up.body.id}`).expect(401);
    });

    it('ciclo: resolver, solicitante reabre ao comentar, resolver de novo e fechar', async () => {
      await http().post(`/api/tickets/${ticketId}/status`).set(auth('rita')).send({ status: 'RESOLVED' }).expect(422);
      let t = await http().post(`/api/tickets/${ticketId}/status`).set(auth('agente')).send({ status: 'RESOLVED' }).expect(200);
      expect(t.body.resolvedAt).not.toBeNull();

      t = await http().post(`/api/tickets/${ticketId}/comments`).set(auth('rita')).send({ body: 'Ainda não funciona' }).expect(201);
      expect(t.body.status).toBe('IN_PROGRESS');
      expect(t.body.resolvedAt).toBeNull();

      await http().post(`/api/tickets/${ticketId}/status`).set(auth('agente')).send({ status: 'WAITING_USER' }).expect(200);
      const waiting = await http().get(`/api/tickets/${ticketId}`).set(auth('agente')).expect(200);
      expect(waiting.body.slaPausedAt).not.toBeNull();
      await http().post(`/api/tickets/${ticketId}/status`).set(auth('agente')).send({ status: 'IN_PROGRESS' }).expect(200);
      const resumed = await http().get(`/api/tickets/${ticketId}`).set(auth('agente')).expect(200);
      expect(resumed.body.slaPausedAt).toBeNull();

      await http().post(`/api/tickets/${ticketId}/status`).set(auth('agente')).send({ status: 'RESOLVED' }).expect(200);
      await http().post(`/api/tickets/${ticketId}/status`).set(auth('rita')).send({ status: 'CLOSED' }).expect(422);
      t = await http().post(`/api/tickets/${ticketId}/status`).set(auth('agente')).send({ status: 'CLOSED' }).expect(200);
      expect(t.body.status).toBe('CLOSED');
      expect(t.body.closedAt).not.toBeNull();
    });

    it('chamado fechado não aceita comentário, anexo, alteração nem nova atribuição', async () => {
      await http().post(`/api/tickets/${ticketId}/comments`).set(auth('agente')).send({ body: 'tarde demais' }).expect(422);
      await http().post(`/api/tickets/${ticketId}/attachments`).set(auth('rita')).attach('file', png, 'x.png').expect(422);
      await http().patch(`/api/tickets/${ticketId}`).set(auth('agente')).send({ priority: 'LOW' }).expect(422);
      await http().post(`/api/tickets/${ticketId}/assign`).set(auth('gestor')).send({ assigneeId: ids.gestor }).expect(422);
      await http().post(`/api/tickets/${ticketId}/status`).set(auth('gestor')).send({ status: 'OPEN' }).expect(422);
    });

    it('mudar a prioridade recalcula os prazos de um chamado aberto', async () => {
      const created = await http().post('/api/tickets').set(auth('rita')).send({ title: 'Impressora travada', description: 'Fila parada', categoryId, priority: 'LOW' }).expect(201);
      const changed = await http().patch(`/api/tickets/${created.body.id}`).set(auth('agente')).send({ priority: 'CRITICAL' }).expect(200);
      expect(new Date(changed.body.resolutionDueAt).getTime()).toBeLessThan(new Date(created.body.resolutionDueAt).getTime());
    });
  });

  describe('ativos', () => {
    let assetId: string;

    it('gestor cadastra ativo; atendente só consulta; solicitante não vê', async () => {
      const res = await http().post('/api/assets').set(auth('gestor')).send({ tag: `nb-${run}`, name: 'Notebook Dell', type: 'NOTEBOOK' }).expect(201);
      assetId = res.body.id;
      expect(res.body).toMatchObject({ tag: `NB-${run}`.toUpperCase(), status: 'IN_STOCK' });
      await http().post('/api/assets').set(auth('gestor')).send({ tag: `NB-${run}`, name: 'Duplicado', type: 'NOTEBOOK' }).expect(409);
      await http().post('/api/assets').set(auth('agente')).send({ tag: 'X1', name: 'x', type: 'OTHER' }).expect(403);
      await http().get('/api/assets').set(auth('agente')).expect(200);
      await http().get('/api/assets').set(auth('rita')).expect(403);
    });

    it('RN-09: em uso exige responsável e aposentado não aceita responsável nem chamados', async () => {
      await http().patch(`/api/assets/${assetId}`).set(auth('gestor')).send({ status: 'IN_USE' }).expect(422);
      await http().patch(`/api/assets/${assetId}`).set(auth('gestor')).send({ status: 'IN_USE', assignedToId: ids.rita }).expect(200);
      await http().patch(`/api/assets/${assetId}`).set(auth('gestor')).send({ status: 'RETIRED', assignedToId: ids.rita }).expect(422);
      // Aposentar sem informar responsável remove o vínculo atual.
      const retired = await http().patch(`/api/assets/${assetId}`).set(auth('gestor')).send({ status: 'RETIRED' }).expect(200);
      expect(retired.body.assignedToId).toBeNull();
      await http().post('/api/tickets').set(auth('agente')).send({ title: 'Com ativo', description: 'Teste', categoryId, assetId }).expect(422);
    });

    it('chamado vinculado a ativo aparece no detalhe do ativo', async () => {
      const a = await http().post('/api/assets').set(auth('gestor')).send({ tag: `mon-${run}`, name: 'Monitor', type: 'MONITOR' }).expect(201);
      const t = await http().post('/api/tickets').set(auth('agente')).send({ title: 'Monitor piscando', description: 'Cabo?', categoryId, assetId: a.body.id }).expect(201);
      const detail = await http().get(`/api/assets/${a.body.id}`).set(auth('agente')).expect(200);
      expect(detail.body.tickets.map((x: { id: string }) => x.id)).toContain(t.body.id);
    });
  });

  describe('painel e auditoria', () => {
    it('painel só para gestão e com números coerentes', async () => {
      await http().get('/api/dashboard/summary').set(auth('agente')).expect(403);
      const res = await http().get('/api/dashboard/summary').set(auth('gestor')).expect(200);
      expect(res.body.totalCreated).toBeGreaterThanOrEqual(3);
      expect(Object.keys(res.body.byStatus)).toHaveLength(6);
      const volume = await http().get('/api/dashboard/volume').set(auth('gestor')).expect(200);
      expect(volume.body).toHaveLength(30);
      await http().get('/api/dashboard/by-category').set(auth('gestor')).expect(200);
      await http().get('/api/dashboard/by-agent').set(auth('admin')).expect(200);
    });

    it('auditoria é só do administrador e registra as ações sem segredos', async () => {
      await http().get('/api/audit').set(auth('gestor')).expect(403);
      const res = await http().get('/api/audit?pageSize=100').set(auth('admin')).expect(200);
      const actions = res.body.items.map((a: { action: string }) => a.action);
      expect(actions).toEqual(expect.arrayContaining(['TICKET_CREATED', 'ATTACHMENT_UPLOADED', 'LOGIN_SUCCEEDED', 'LOGIN_FAILED']));
      expect(JSON.stringify(res.body)).not.toMatch(/Senha-Forte-123|passwordHash|refresh/i);
    });
  });

  describe('cabeçalhos e erros', () => {
    it('envia cabeçalhos de segurança e erro padronizado com requestId', async () => {
      const res = await http().get('/api/tickets/nao-uuid').set(auth('rita')).expect(400);
      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['x-powered-by']).toBeUndefined();
      expect(res.body).toMatchObject({ statusCode: 400, requestId: expect.any(String) });
    });

    it('health informa o banco', async () => {
      const res = await http().get('/api/health').expect(200);
      expect(res.body).toMatchObject({ status: 'ok', database: 'up' });
    });
  });
});
