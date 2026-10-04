import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { canBeAssignee, isStaff, RoleName } from '../../common/roles';
import {
  allowedTransitions,
  applyPauseTransition,
  checkTransitionPermission,
  computeDueDates,
  countsAsFirstResponse,
  DEFAULT_SLA,
  isResponseBreached,
  isTerminal,
  Priority,
  recalculateDueDates,
  resolutionIndicator,
  SlaIndicator,
  SlaPolicyMinutes,
  TicketStatus,
} from './ticket.rules';
import type { TicketSort } from './dto/tickets.dto';
import {
  CommentRecord,
  HistoryEntry,
  HistoryRecord,
  TicketRecord,
  TicketsRepository,
  TicketUpdate,
} from './tickets.repository';

export interface Actor {
  id: string;
  role: RoleName;
}

export interface TicketView extends Omit<TicketRecord, 'description'> {
  description: string;
  sla: { responseBreached: boolean; resolution: SlaIndicator };
  allowedTransitions: TicketStatus[];
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  perPage: number;
}

export interface ListQuery {
  status?: TicketStatus;
  priority?: Priority;
  categoryId?: string;
  assigneeId?: string;
  requesterId?: string;
  assetId?: string;
  from?: string;
  to?: string;
  slaBreached?: boolean;
  q?: string;
  page: number;
  perPage: number;
  sort: TicketSort;
}

const FIELD_LABELS = { title: 'TITLE_CHANGED', priority: 'PRIORITY_CHANGED' } as const;

@Injectable()
export class TicketsService {
  constructor(
    private readonly repo: TicketsRepository,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async create(
    actor: Actor,
    input: { title: string; description: string; categoryId: string; priority?: Priority; assetId?: string },
  ): Promise<TicketView> {
    await this.assertCategory(input.categoryId);
    if (input.assetId) await this.assertAsset(input.assetId);

    const priority = input.priority ?? 'MEDIUM';
    const policy = await this.policyFor(priority);
    const createdAt = this.now();
    const due = computeDueDates(createdAt, policy);

    const ticket = await this.repo.create(
      {
        title: input.title,
        description: input.description,
        priority,
        categoryId: input.categoryId,
        requesterId: actor.id,
        assetId: input.assetId ?? null,
        createdAt,
        ...due,
      },
      [{ actorId: actor.id, action: 'CREATED', toValue: 'OPEN' }],
    );
    return this.toView(ticket, actor);
  }

  async list(actor: Actor, query: ListQuery): Promise<Page<TicketView>> {
    const staff = isStaff(actor.role);
    const { items, total } = await this.repo.list({
      // Solicitante só enxerga os próprios chamados, ignorando o filtro enviado.
      requesterId: staff ? query.requesterId : actor.id,
      status: query.status,
      priority: query.priority,
      categoryId: query.categoryId,
      assigneeId: query.assigneeId,
      assetId: query.assetId,
      from: query.from ? new Date(query.from) : undefined,
      to: query.to ? new Date(query.to) : undefined,
      slaBreached: query.slaBreached,
      q: query.q || undefined,
      now: this.now(),
      sort: query.sort,
      skip: (query.page - 1) * query.perPage,
      take: query.perPage,
    });
    return {
      items: items.map((t) => this.toView(t, actor)),
      total,
      page: query.page,
      perPage: query.perPage,
    };
  }

  async get(actor: Actor, id: string): Promise<TicketView> {
    return this.toView(await this.load(actor, id), actor);
  }

  async update(
    actor: Actor,
    id: string,
    change: { title?: string; categoryId?: string; priority?: Priority; assetId?: string | null },
  ): Promise<TicketView> {
    if (Object.values(change).every((v) => v === undefined)) {
      throw new BadRequestException('Informe ao menos um campo para alterar');
    }
    const ticket = await this.load(actor, id);
    this.assertOpenForChanges(ticket);

    const data: TicketUpdate = {};
    const history: HistoryEntry[] = [];
    const record = (action: string, from: string | null, to: string | null) =>
      history.push({ actorId: actor.id, action, fromValue: from, toValue: to });

    if (change.title !== undefined && change.title !== ticket.title) {
      data.title = change.title;
      record(FIELD_LABELS.title, ticket.title, change.title);
    }
    if (change.categoryId !== undefined && change.categoryId !== ticket.category.id) {
      await this.assertCategory(change.categoryId);
      data.categoryId = change.categoryId;
      record('CATEGORY_CHANGED', ticket.category.id, change.categoryId);
    }
    if (change.assetId !== undefined && change.assetId !== ticket.assetId) {
      if (change.assetId) await this.assertAsset(change.assetId);
      data.assetId = change.assetId;
      record('ASSET_CHANGED', ticket.assetId, change.assetId);
    }
    if (change.priority !== undefined && change.priority !== ticket.priority) {
      const [oldPolicy, newPolicy] = await Promise.all([
        this.policyFor(ticket.priority),
        this.policyFor(change.priority),
      ]);
      Object.assign(data, { priority: change.priority }, recalculateDueDates(ticket, oldPolicy, newPolicy));
      record(FIELD_LABELS.priority, ticket.priority, change.priority);
    }

    if (history.length === 0) return this.toView(ticket, actor);
    return this.toView(await this.repo.update(id, ticket.status, data, history), actor);
  }

  async assign(actor: Actor, id: string, assigneeId: string): Promise<TicketView> {
    const ticket = await this.load(actor, id);
    this.assertOpenForChanges(ticket);

    // Atendente só assume para si; gestor e administrador atribuem a qualquer um.
    if (actor.role === 'AGENT' && assigneeId !== actor.id) {
      throw new ForbiddenException('Atendentes só podem assumir chamados para si mesmos');
    }
    const target = await this.repo.findUser(assigneeId);
    if (!target || !canBeAssignee(target)) {
      throw new UnprocessableEntityException('O responsável deve ser um atendente, gestor ou administrador ativo');
    }
    if (ticket.assignee?.id === assigneeId) return this.toView(ticket, actor);

    const data: TicketUpdate = { assigneeId };
    const history: HistoryEntry[] = [
      { actorId: actor.id, action: 'ASSIGNEE_CHANGED', fromValue: ticket.assignee?.id ?? null, toValue: assigneeId },
    ];
    // RN-03: assumir um chamado aberto o coloca em atendimento.
    if (ticket.status === 'OPEN') this.applyStatus(ticket, 'IN_PROGRESS', actor, data, history);

    return this.toView(await this.repo.update(id, ticket.status, data, history), actor);
  }

  async changeStatus(actor: Actor, id: string, to: TicketStatus): Promise<TicketView> {
    const ticket = await this.load(actor, id);
    const denied = checkTransitionPermission(ticket.status, to, {
      role: actor.role,
      actorId: actor.id,
      requesterId: ticket.requester.id,
    });
    if (denied) {
      // Quem não é dono nem equipe não deveria nem saber do chamado (já tratado em load).
      throw new UnprocessableEntityException(denied);
    }

    const data: TicketUpdate = {};
    const history: HistoryEntry[] = [];
    this.applyStatus(ticket, to, actor, data, history);

    // Equipe que põe um chamado sem responsável em atendimento passa a ser o responsável.
    if (to === 'IN_PROGRESS' && !ticket.assignee && isStaff(actor.role)) {
      data.assigneeId = actor.id;
      history.push({ actorId: actor.id, action: 'ASSIGNEE_CHANGED', fromValue: null, toValue: actor.id });
    }
    return this.toView(await this.repo.update(id, ticket.status, data, history), actor);
  }

  async listComments(actor: Actor, id: string): Promise<CommentRecord[]> {
    await this.load(actor, id);
    // RN-11: comentários internos nunca saem para o solicitante.
    return this.repo.listComments(id, isStaff(actor.role));
  }

  async addComment(actor: Actor, id: string, input: { body: string; internal?: boolean }): Promise<TicketView> {
    const ticket = await this.load(actor, id);
    if (isTerminal(ticket.status)) {
      throw new UnprocessableEntityException('Chamados fechados ou cancelados não aceitam comentários');
    }
    const internal = input.internal === true;
    if (internal && !isStaff(actor.role)) {
      throw new ForbiddenException('Somente a equipe pode registrar comentários internos');
    }

    const data: TicketUpdate = {};
    const history: HistoryEntry[] = [];
    if (
      !ticket.firstRespondedAt &&
      countsAsFirstResponse({ actorRole: actor.role, kind: 'COMMENT', internal })
    ) {
      data.firstRespondedAt = this.now();
    }
    // RN-07: o solicitante que comenta num chamado resolvido o reabre.
    if (ticket.status === 'RESOLVED' && !isStaff(actor.role)) {
      this.applyStatus(ticket, 'IN_PROGRESS', actor, data, history);
    }

    const updated = await this.repo.update(id, ticket.status, data, history, {
      authorId: actor.id,
      body: input.body,
      internal,
    });
    return this.toView(updated, actor);
  }

  async listHistory(actor: Actor, id: string): Promise<HistoryRecord[]> {
    await this.load(actor, id);
    return this.repo.listHistory(id);
  }

  // Aplica uma mudança de status com todos os efeitos colaterais: pausa de SLA,
  // datas de resolução e fechamento, primeira resposta e histórico.
  private applyStatus(
    ticket: TicketRecord,
    to: TicketStatus,
    actor: Actor,
    data: TicketUpdate,
    history: HistoryEntry[],
  ): void {
    const now = this.now();
    data.status = to;
    history.push({ actorId: actor.id, action: 'STATUS_CHANGED', fromValue: ticket.status, toValue: to });

    const pause = applyPauseTransition({
      from: ticket.status,
      to,
      now,
      slaPausedAt: ticket.slaPausedAt,
      resolutionDueAt: data.resolutionDueAt ?? ticket.resolutionDueAt,
    });
    data.slaPausedAt = pause.slaPausedAt;
    data.resolutionDueAt = pause.resolutionDueAt;

    if (to === 'RESOLVED') data.resolvedAt = now;
    if (ticket.status === 'RESOLVED' && to === 'IN_PROGRESS') data.resolvedAt = null;
    if (to === 'CLOSED') data.closedAt = now;

    if (
      !ticket.firstRespondedAt &&
      data.firstRespondedAt === undefined &&
      countsAsFirstResponse({ actorRole: actor.role, kind: 'STATUS_CHANGE', toStatus: to })
    ) {
      data.firstRespondedAt = now;
    }
  }

  // Solicitante que não é dono recebe 404, não 403, para não revelar que o chamado existe.
  private async load(actor: Actor, id: string): Promise<TicketRecord> {
    const ticket = await this.repo.findById(id);
    if (!ticket || (!isStaff(actor.role) && ticket.requester.id !== actor.id)) {
      throw new NotFoundException('Chamado não encontrado');
    }
    return ticket;
  }

  private assertOpenForChanges(ticket: TicketRecord): void {
    if (isTerminal(ticket.status)) {
      throw new UnprocessableEntityException(`Chamado ${ticket.status} não aceita alterações`);
    }
  }

  private async assertCategory(id: string): Promise<void> {
    const category = await this.repo.findCategory(id);
    if (!category) throw new UnprocessableEntityException('Categoria não encontrada');
    if (!category.active) throw new UnprocessableEntityException('Categoria inativa');
  }

  // RN-09: ativo aposentado não pode ser vinculado a chamados.
  private async assertAsset(id: string): Promise<void> {
    const asset = await this.repo.findAsset(id);
    if (!asset) throw new UnprocessableEntityException('Ativo não encontrado');
    if (asset.status === 'RETIRED') throw new UnprocessableEntityException('Ativo aposentado não pode ser vinculado');
  }

  private async policyFor(priority: Priority): Promise<SlaPolicyMinutes> {
    return (await this.repo.getSlaPolicy(priority)) ?? DEFAULT_SLA[priority];
  }

  private toView(ticket: TicketRecord, actor: Actor): TicketView {
    const now = this.now();
    const snapshot = { ...ticket };
    const allowed = allowedTransitions(ticket.status).filter(
      (to) =>
        checkTransitionPermission(ticket.status, to, {
          role: actor.role,
          actorId: actor.id,
          requesterId: ticket.requester.id,
        }) === null,
    );
    return {
      ...ticket,
      sla: {
        responseBreached: isResponseBreached(snapshot, now),
        resolution: resolutionIndicator(snapshot, now),
      },
      allowedTransitions: allowed,
    };
  }
}

