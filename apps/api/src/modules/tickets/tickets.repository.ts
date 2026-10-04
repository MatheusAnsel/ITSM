import type { RoleName } from '../../common/roles';
import type { Priority, SlaPolicyMinutes, TicketStatus } from './ticket.rules';
import type { TicketSort } from './dto/tickets.dto';

export interface NamedRef {
  id: string;
  name: string;
}

export interface TicketRecord {
  id: string;
  number: number;
  title: string;
  description: string;
  status: TicketStatus;
  priority: Priority;
  category: NamedRef;
  requester: NamedRef;
  assignee: NamedRef | null;
  assetId: string | null;
  responseDueAt: Date;
  resolutionDueAt: Date;
  slaPausedAt: Date | null;
  firstRespondedAt: Date | null;
  resolvedAt: Date | null;
  closedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface NewTicket {
  title: string;
  description: string;
  priority: Priority;
  categoryId: string;
  requesterId: string;
  assetId: string | null;
  // Mesmo instante usado para calcular os vencimentos, evitando deriva entre app e banco.
  createdAt: Date;
  responseDueAt: Date;
  resolutionDueAt: Date;
}

export interface TicketUpdate {
  title?: string;
  status?: TicketStatus;
  priority?: Priority;
  categoryId?: string;
  assigneeId?: string | null;
  assetId?: string | null;
  responseDueAt?: Date;
  resolutionDueAt?: Date;
  slaPausedAt?: Date | null;
  firstRespondedAt?: Date | null;
  resolvedAt?: Date | null;
  closedAt?: Date | null;
}

export interface HistoryEntry {
  actorId: string;
  action: string;
  fromValue?: string | null;
  toValue?: string | null;
}

export interface NewComment {
  authorId: string;
  body: string;
  internal: boolean;
}

export interface CommentRecord {
  id: string;
  body: string;
  internal: boolean;
  createdAt: Date;
  author: NamedRef;
}

export interface HistoryRecord {
  id: string;
  action: string;
  fromValue: string | null;
  toValue: string | null;
  createdAt: Date;
  actor: NamedRef;
}

export interface TicketFilter {
  requesterId?: string;
  status?: TicketStatus;
  priority?: Priority;
  categoryId?: string;
  assigneeId?: string;
  assetId?: string;
  from?: Date;
  to?: Date;
  slaBreached?: boolean;
  q?: string;
  now: Date;
  sort: TicketSort;
  skip: number;
  take: number;
}

export interface UserRef {
  id: string;
  role: RoleName;
  active: boolean;
}

export abstract class TicketsRepository {
  abstract findCategory(id: string): Promise<{ id: string; active: boolean } | null>;
  abstract findAsset(id: string): Promise<{ id: string; status: string } | null>;
  abstract findUser(id: string): Promise<UserRef | null>;
  abstract getSlaPolicy(priority: Priority): Promise<SlaPolicyMinutes | null>;

  abstract create(data: NewTicket, history: HistoryEntry[]): Promise<TicketRecord>;
  abstract findById(id: string): Promise<TicketRecord | null>;
  abstract list(filter: TicketFilter): Promise<{ items: TicketRecord[]; total: number }>;

  // Aplica a alteração, o histórico e o comentário na mesma transação. Falha com
  // conflito se o status mudou desde a leitura (`expectedStatus`).
  abstract update(
    id: string,
    expectedStatus: TicketStatus,
    data: TicketUpdate,
    history: HistoryEntry[],
    comment?: NewComment,
  ): Promise<TicketRecord>;

  abstract listComments(ticketId: string, includeInternal: boolean): Promise<CommentRecord[]>;
  abstract listHistory(ticketId: string): Promise<HistoryRecord[]>;
}
