import { ConflictException, ForbiddenException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import type { RoleName } from '../../common/roles';
import { DEFAULT_SLA, Priority, SlaPolicyMinutes, TicketStatus } from './ticket.rules';
import {
  CommentRecord,
  HistoryEntry,
  HistoryRecord,
  NewComment,
  NewTicket,
  TicketFilter,
  TicketRecord,
  TicketsRepository,
  TicketUpdate,
  UserRef,
} from './tickets.repository';
import { Actor, TicketsService } from './tickets.service';

const CAT_OK = 'c-ok';
const CAT_OFF = 'c-off';
const ASSET_OK = 'a-ok';
const ASSET_RETIRED = 'a-retired';

class MemoryTickets extends TicketsRepository {
  users = new Map<string, UserRef & { name: string }>();
  tickets: TicketRecord[] = [];
  comments: (CommentRecord & { ticketId: string })[] = [];
  history: (HistoryEntry & { ticketId: string })[] = [];
  policies = new Map<Priority, SlaPolicyMinutes>();
  lastFilter?: TicketFilter;
  private seq = 0;

  async findCategory(id: string) {
    return id === CAT_OK ? { id, active: true } : id === CAT_OFF ? { id, active: false } : null;
  }
  async findAsset(id: string) {
    return id === ASSET_OK ? { id, status: 'IN_USE' } : id === ASSET_RETIRED ? { id, status: 'RETIRED' } : null;
  }
  async findUser(id: string) {
    return this.users.get(id) ?? null;
  }
  async getSlaPolicy(priority: Priority) {
    return this.policies.get(priority) ?? null;
  }
  async create(data: NewTicket, history: HistoryEntry[]) {
    const owner = this.users.get(data.requesterId)!;
    const t: TicketRecord = {
      id: `t${++this.seq}`,
      number: 1000 + this.seq,
      title: data.title,
      description: data.description,
      status: 'OPEN',
      priority: data.priority,
      category: { id: data.categoryId, name: 'Cat' },
      requester: { id: owner.id, name: owner.name },
      assignee: null,
      assetId: data.assetId,
      responseDueAt: data.responseDueAt,
      resolutionDueAt: data.resolutionDueAt,
      slaPausedAt: null,
      firstRespondedAt: null,
      resolvedAt: null,
      closedAt: null,
      createdAt: data.createdAt,
      updatedAt: data.createdAt,
    };
    this.tickets.push(t);
    history.forEach((h) => this.history.push({ ...h, ticketId: t.id }));
    return { ...t };
  }
  async findById(id: string) {
    const t = this.tickets.find((x) => x.id === id);
    return t ? { ...t } : null;
  }
  async list(filter: TicketFilter) {
    this.lastFilter = filter;
    const items = this.tickets.filter((t) => !filter.requesterId || t.requester.id === filter.requesterId);
    return { items: items.slice(filter.skip, filter.skip + filter.take).map((t) => ({ ...t })), total: items.length };
  }
  async update(id: string, expected: TicketStatus, data: TicketUpdate, history: HistoryEntry[], comment?: NewComment) {
    const t = this.tickets.find((x) => x.id === id)!;
    if (t.status !== expected) throw new ConflictException('conflito');
    const { categoryId, assigneeId, ...rest } = data;
    Object.assign(t, rest);
    if (categoryId) t.category = { id: categoryId, name: 'Cat' };
    if (assigneeId !== undefined) {
      const u = assigneeId ? this.users.get(assigneeId)! : null;
      t.assignee = u ? { id: u.id, name: u.name } : null;
    }
    history.forEach((h) => this.history.push({ ...h, ticketId: id }));
    if (comment) {
      const author = this.users.get(comment.authorId)!;
      this.comments.push({
        id: `m${++this.seq}`,
        ticketId: id,
        body: comment.body,
        internal: comment.internal,
        createdAt: new Date(),
        author: { id: author.id, name: author.name },
      });
    }
    return { ...t };
  }
  async listComments(ticketId: string, includeInternal: boolean) {
    return this.comments.filter((c) => c.ticketId === ticketId && (includeInternal || !c.internal));
  }
  async listHistory(ticketId: string): Promise<HistoryRecord[]> {
    return this.history
      .filter((h) => h.ticketId === ticketId)
      .map((h, i) => ({
        id: String(i),
        action: h.action,
        fromValue: h.fromValue ?? null,
        toValue: h.toValue ?? null,
        createdAt: new Date(),
        actor: { id: h.actorId, name: 'x' },
      }));
  }
}

const t0 = new Date('2026-03-02T09:00:00Z');
const plus = (min: number) => new Date(t0.getTime() + min * 60_000);

describe('TicketsService', () => {
  let repo: MemoryTickets;
  let service: TicketsService;
  let clock: Date;
  const requester: Actor = { id: 'req', role: 'REQUESTER' };
  const otherRequester: Actor = { id: 'req2', role: 'REQUESTER' };
  const agent: Actor = { id: 'agent', role: 'AGENT' };
  const manager: Actor = { id: 'mgr', role: 'MANAGER' };

  const addUser = (id: string, role: RoleName, active = true) => repo.users.set(id, { id, role, active, name: id });
  const open = (actor = requester, extra: Partial<{ priority: Priority; assetId: string }> = {}) =>
    service.create(actor, { title: 'VPN fora do ar', description: 'Sem acesso', categoryId: CAT_OK, ...extra });

  beforeEach(() => {
    repo = new MemoryTickets();
    clock = t0;
    service = new TicketsService(repo, () => clock);
    addUser('req', 'REQUESTER');
    addUser('req2', 'REQUESTER');
    addUser('agent', 'AGENT');
    addUser('agent2', 'AGENT');
    addUser('mgr', 'MANAGER');
    addUser('gone', 'AGENT', false);
  });

  describe('abertura', () => {
    it('cria em OPEN, prioridade MEDIUM por padrão, com SLA da política padrão e histórico', async () => {
      const t = await open();
      expect(t).toMatchObject({ status: 'OPEN', priority: 'MEDIUM', requester: { id: 'req' } });
      expect(t.responseDueAt).toEqual(plus(DEFAULT_SLA.MEDIUM.firstResponseMinutes));
      expect(t.resolutionDueAt).toEqual(plus(DEFAULT_SLA.MEDIUM.resolutionMinutes));
      expect((await service.listHistory(requester, t.id))[0]).toMatchObject({ action: 'CREATED', toValue: 'OPEN' });
    });

    it('usa a política editada pelo administrador quando existe', async () => {
      repo.policies.set('HIGH', { firstResponseMinutes: 10, resolutionMinutes: 120 });
      const t = await open(requester, { priority: 'HIGH' });
      expect(t.responseDueAt).toEqual(plus(10));
      expect(t.resolutionDueAt).toEqual(plus(120));
    });

    it('rejeita categoria inexistente ou inativa e ativo inexistente ou aposentado', async () => {
      const base = { title: 'Algo', description: 'Algo' };
      await expect(service.create(requester, { ...base, categoryId: 'nope' })).rejects.toBeInstanceOf(UnprocessableEntityException);
      await expect(service.create(requester, { ...base, categoryId: CAT_OFF })).rejects.toThrow('Categoria inativa');
      await expect(service.create(requester, { ...base, categoryId: CAT_OK, assetId: 'nope' })).rejects.toThrow('Ativo não encontrado');
      await expect(service.create(requester, { ...base, categoryId: CAT_OK, assetId: ASSET_RETIRED })).rejects.toThrow('aposentado');
      await expect(open(requester, { assetId: ASSET_OK })).resolves.toMatchObject({ assetId: ASSET_OK });
    });
  });

  describe('visibilidade', () => {
    it('solicitante lista só os próprios chamados, mesmo forçando outro requesterId', async () => {
      await open(requester);
      await open(otherRequester);
      const page = await service.list(requester, { requesterId: 'req2', page: 1, perPage: 20, sort: '-createdAt' });
      expect(repo.lastFilter?.requesterId).toBe('req');
      expect(page.items.map((t) => t.requester.id)).toEqual(['req']);
    });

    it('equipe vê todos e pode filtrar por solicitante', async () => {
      await open(requester);
      await open(otherRequester);
      expect((await service.list(agent, { page: 1, perPage: 20, sort: '-createdAt' })).total).toBe(2);
      await service.list(agent, { requesterId: 'req2', page: 1, perPage: 20, sort: '-createdAt' });
      expect(repo.lastFilter?.requesterId).toBe('req2');
    });

    it('chamado alheio responde 404 ao solicitante, em todas as rotas de leitura e escrita', async () => {
      const t = await open(requester);
      await expect(service.get(otherRequester, t.id)).rejects.toBeInstanceOf(NotFoundException);
      await expect(service.listComments(otherRequester, t.id)).rejects.toBeInstanceOf(NotFoundException);
      await expect(service.listHistory(otherRequester, t.id)).rejects.toBeInstanceOf(NotFoundException);
      await expect(service.addComment(otherRequester, t.id, { body: 'oi' })).rejects.toBeInstanceOf(NotFoundException);
      await expect(service.changeStatus(otherRequester, t.id, 'CANCELLED')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('paginação converte página em deslocamento', async () => {
      for (let i = 0; i < 5; i++) await open();
      const page = await service.list(agent, { page: 2, perPage: 2, sort: '-createdAt' });
      expect(repo.lastFilter).toMatchObject({ skip: 2, take: 2 });
      expect(page).toMatchObject({ total: 5, page: 2, perPage: 2 });
    });
  });

  describe('atribuição (RN-03)', () => {
    it('atendente assume chamado OPEN: vira responsável, vai a IN_PROGRESS e conta como primeira resposta', async () => {
      const t = await open();
      clock = plus(20);
      const assigned = await service.assign(agent, t.id, agent.id);
      expect(assigned).toMatchObject({ status: 'IN_PROGRESS', assignee: { id: 'agent' }, firstRespondedAt: plus(20) });
      const actions = (await service.listHistory(agent, t.id)).map((h) => h.action);
      expect(actions).toEqual(['CREATED', 'ASSIGNEE_CHANGED', 'STATUS_CHANGED']);
    });

    it('atendente não atribui a outra pessoa; gestor atribui a qualquer atendente ativo', async () => {
      const t = await open();
      await expect(service.assign(agent, t.id, 'agent2')).rejects.toBeInstanceOf(ForbiddenException);
      await expect(service.assign(manager, t.id, 'agent2')).resolves.toMatchObject({ assignee: { id: 'agent2' } });
    });

    it('recusa responsável inativo, inexistente ou solicitante', async () => {
      const t = await open();
      for (const id of ['gone', 'nope', 'req2']) {
        await expect(service.assign(manager, t.id, id)).rejects.toBeInstanceOf(UnprocessableEntityException);
      }
    });

    it('reatribuir não muda o status e repetir o mesmo responsável não gera histórico', async () => {
      const t = await open();
      await service.assign(manager, t.id, 'agent');
      const re = await service.assign(manager, t.id, 'agent2');
      expect(re.status).toBe('IN_PROGRESS');
      const before = repo.history.length;
      await service.assign(manager, t.id, 'agent2');
      expect(repo.history.length).toBe(before);
    });

    it('chamados fechados ou cancelados não podem ser atribuídos', async () => {
      const t = await open();
      await service.changeStatus(requester, t.id, 'CANCELLED');
      await expect(service.assign(manager, t.id, 'agent')).rejects.toThrow('não aceita alterações');
    });
  });

  describe('status (RN-02, RN-05, RN-06, RN-07)', () => {
    it('equipe em IN_PROGRESS sem responsável vira responsável', async () => {
      const t = await open();
      const r = await service.changeStatus(agent, t.id, 'IN_PROGRESS');
      expect(r.assignee?.id).toBe('agent');
    });

    it('recusa transição inválida listando as permitidas', async () => {
      const t = await open();
      await expect(service.changeStatus(agent, t.id, 'RESOLVED')).rejects.toThrow('IN_PROGRESS, CANCELLED');
    });

    it('solicitante só cancela o próprio chamado aberto', async () => {
      const t = await open();
      await service.changeStatus(agent, t.id, 'IN_PROGRESS');
      await expect(service.changeStatus(requester, t.id, 'CANCELLED')).rejects.toThrow('Sem permissão');
      const fresh = await open();
      await expect(service.changeStatus(requester, fresh.id, 'CANCELLED')).resolves.toMatchObject({ status: 'CANCELLED' });
    });

    it('pausa o SLA em WAITING_USER e soma o tempo parado ao sair', async () => {
      const t = await open();
      const due = t.resolutionDueAt;
      clock = plus(10);
      await service.changeStatus(agent, t.id, 'IN_PROGRESS');
      clock = plus(60);
      const paused = await service.changeStatus(agent, t.id, 'WAITING_USER');
      expect(paused.slaPausedAt).toEqual(plus(60));
      expect(paused.sla.resolution).toBe('OK');
      clock = plus(150);
      const resumed = await service.changeStatus(agent, t.id, 'IN_PROGRESS');
      expect(resumed.slaPausedAt).toBeNull();
      expect(resumed.resolutionDueAt).toEqual(new Date(due.getTime() + 90 * 60_000));
    });

    it('grava resolvedAt e closedAt, e a reabertura limpa resolvedAt', async () => {
      const t = await open();
      await service.changeStatus(agent, t.id, 'IN_PROGRESS');
      clock = plus(100);
      expect((await service.changeStatus(agent, t.id, 'RESOLVED')).resolvedAt).toEqual(plus(100));
      expect((await service.changeStatus(requester, t.id, 'IN_PROGRESS')).resolvedAt).toBeNull();
      await service.changeStatus(agent, t.id, 'RESOLVED');
      clock = plus(200);
      expect((await service.changeStatus(agent, t.id, 'CLOSED')).closedAt).toEqual(plus(200));
    });

    it('estados finais não aceitam novas mudanças', async () => {
      const t = await open();
      await service.changeStatus(requester, t.id, 'CANCELLED');
      await expect(service.changeStatus(manager, t.id, 'IN_PROGRESS')).rejects.toThrow('não aceita novas mudanças');
    });

    it('expõe só as transições permitidas ao ator', async () => {
      const t = await open();
      expect((await service.get(requester, t.id)).allowedTransitions).toEqual(['CANCELLED']);
      expect((await service.get(agent, t.id)).allowedTransitions).toEqual(['IN_PROGRESS', 'CANCELLED']);
    });

    it('conflito de edição simultânea vira 409', async () => {
      const t = await open();
      const stale = await repo.findById(t.id);
      await service.changeStatus(agent, t.id, 'IN_PROGRESS');
      await expect(repo.update(t.id, stale!.status, {}, [])).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('comentários (RN-06, RN-07, RN-11)', () => {
    it('comentário público da equipe registra a primeira resposta uma única vez', async () => {
      const t = await open();
      clock = plus(30);
      expect((await service.addComment(agent, t.id, { body: 'Olhando' })).firstRespondedAt).toEqual(plus(30));
      clock = plus(90);
      expect((await service.addComment(agent, t.id, { body: 'Mais um' })).firstRespondedAt).toEqual(plus(30));
    });

    it('comentário interno e comentário do solicitante não contam como resposta', async () => {
      const t = await open();
      expect((await service.addComment(agent, t.id, { body: 'nota', internal: true })).firstRespondedAt).toBeNull();
      expect((await service.addComment(requester, t.id, { body: 'e aí?' })).firstRespondedAt).toBeNull();
    });

    it('solicitante não cria comentário interno e nunca recebe os internos', async () => {
      const t = await open();
      await expect(service.addComment(requester, t.id, { body: 'x', internal: true })).rejects.toBeInstanceOf(ForbiddenException);
      await service.addComment(agent, t.id, { body: 'segredo', internal: true });
      await service.addComment(agent, t.id, { body: 'público' });
      expect((await service.listComments(requester, t.id)).map((c) => c.body)).toEqual(['público']);
      expect((await service.listComments(agent, t.id)).map((c) => c.body)).toEqual(['segredo', 'público']);
    });

    it('solicitante que comenta num chamado resolvido o reabre', async () => {
      const t = await open();
      await service.changeStatus(agent, t.id, 'IN_PROGRESS');
      await service.changeStatus(agent, t.id, 'RESOLVED');
      const r = await service.addComment(requester, t.id, { body: 'continua com erro' });
      expect(r).toMatchObject({ status: 'IN_PROGRESS', resolvedAt: null });
    });

    it('comentário da equipe num chamado resolvido não o reabre', async () => {
      const t = await open();
      await service.changeStatus(agent, t.id, 'IN_PROGRESS');
      await service.changeStatus(agent, t.id, 'RESOLVED');
      expect((await service.addComment(agent, t.id, { body: 'nota' })).status).toBe('RESOLVED');
    });

    it('chamados fechados ou cancelados não aceitam comentários', async () => {
      const t = await open();
      await service.changeStatus(requester, t.id, 'CANCELLED');
      await expect(service.addComment(agent, t.id, { body: 'oi' })).rejects.toBeInstanceOf(UnprocessableEntityException);
    });
  });

  describe('edição (RN-01, RN-14)', () => {
    it('muda prioridade recalculando prazos e preservando a pausa já somada', async () => {
      const t = await open();
      const pausedDue = new Date(t.resolutionDueAt.getTime() + 90 * 60_000);
      repo.tickets[0].resolutionDueAt = pausedDue;
      const r = await service.update(agent, t.id, { priority: 'HIGH' });
      expect(r.priority).toBe('HIGH');
      expect(r.responseDueAt).toEqual(plus(DEFAULT_SLA.HIGH.firstResponseMinutes));
      expect(r.resolutionDueAt).toEqual(plus(DEFAULT_SLA.HIGH.resolutionMinutes + 90));
    });

    it('registra no histórico cada campo alterado, com valor anterior e novo', async () => {
      const t = await open();
      await service.update(agent, t.id, { title: 'Novo título', priority: 'CRITICAL', assetId: ASSET_OK });
      const h = await service.listHistory(agent, t.id);
      expect(h.map((x) => x.action)).toEqual(['CREATED', 'TITLE_CHANGED', 'ASSET_CHANGED', 'PRIORITY_CHANGED']);
      expect(h.find((x) => x.action === 'PRIORITY_CHANGED')).toMatchObject({ fromValue: 'MEDIUM', toValue: 'CRITICAL' });
    });

    it('remove o ativo com null, valida categoria nova e ignora alteração sem efeito', async () => {
      const t = await open(requester, { assetId: ASSET_OK });
      expect((await service.update(agent, t.id, { assetId: null })).assetId).toBeNull();
      await expect(service.update(agent, t.id, { categoryId: CAT_OFF })).rejects.toThrow('Categoria inativa');
      const before = repo.history.length;
      await service.update(agent, t.id, { priority: 'MEDIUM' });
      expect(repo.history.length).toBe(before);
    });

    it('exige ao menos um campo e bloqueia chamado encerrado', async () => {
      const t = await open();
      await expect(service.update(agent, t.id, {})).rejects.toThrow('ao menos um campo');
      await service.changeStatus(requester, t.id, 'CANCELLED');
      await expect(service.update(agent, t.id, { title: 'Outro' })).rejects.toThrow('não aceita alterações');
    });
  });

  describe('indicadores de SLA na resposta', () => {
    it('marca resposta violada e resolução em risco ou violada conforme o relógio', async () => {
      const t = await open();
      clock = plus(DEFAULT_SLA.MEDIUM.firstResponseMinutes + 1);
      expect((await service.get(agent, t.id)).sla.responseBreached).toBe(true);
      clock = plus(DEFAULT_SLA.MEDIUM.resolutionMinutes * 0.9);
      expect((await service.get(agent, t.id)).sla.resolution).toBe('AT_RISK');
      clock = plus(DEFAULT_SLA.MEDIUM.resolutionMinutes + 1);
      expect((await service.get(agent, t.id)).sla.resolution).toBe('BREACHED');
    });
  });
});
