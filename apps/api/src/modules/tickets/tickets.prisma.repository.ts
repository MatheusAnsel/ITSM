import { ConflictException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { TicketSort } from './dto/tickets.dto';
import type { Priority, SlaPolicyMinutes, TicketStatus } from './ticket.rules';
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

const TICKET_INCLUDE = {
  category: { select: { id: true, name: true } },
  requester: { select: { id: true, name: true } },
  assignee: { select: { id: true, name: true } },
} as const;

const ORDER: Record<TicketSort, Prisma.TicketOrderByWithRelationInput> = {
  createdAt: { createdAt: 'asc' },
  '-createdAt': { createdAt: 'desc' },
  resolutionDueAt: { resolutionDueAt: 'asc' },
  '-resolutionDueAt': { resolutionDueAt: 'desc' },
  number: { number: 'asc' },
  '-number': { number: 'desc' },
};

type TicketRow = Prisma.TicketGetPayload<{ include: typeof TICKET_INCLUDE }>;

function toRecord(row: TicketRow): TicketRecord {
  return { ...row, status: row.status as TicketStatus, priority: row.priority as Priority };
}

function toHistoryRows(ticketId: string, entries: HistoryEntry[]) {
  return entries.map((e) => ({
    ticketId,
    actorId: e.actorId,
    action: e.action,
    fromValue: e.fromValue ?? null,
    toValue: e.toValue ?? null,
  }));
}

@Injectable()
export class PrismaTicketsRepository extends TicketsRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  findCategory(id: string) {
    return this.prisma.category.findUnique({ where: { id }, select: { id: true, active: true } });
  }

  findAsset(id: string) {
    return this.prisma.asset.findUnique({ where: { id }, select: { id: true, status: true } });
  }

  async findUser(id: string): Promise<UserRef | null> {
    return this.prisma.user.findUnique({ where: { id }, select: { id: true, role: true, active: true } });
  }

  async getSlaPolicy(priority: Priority): Promise<SlaPolicyMinutes | null> {
    return this.prisma.slaPolicy.findUnique({
      where: { priority },
      select: { firstResponseMinutes: true, resolutionMinutes: true },
    });
  }

  async create(data: NewTicket, history: HistoryEntry[]): Promise<TicketRecord> {
    const row = await this.prisma.$transaction(async (tx) => {
      const created = await tx.ticket.create({ data, include: TICKET_INCLUDE });
      await tx.ticketHistory.createMany({ data: toHistoryRows(created.id, history) });
      return created;
    });
    return toRecord(row);
  }

  async findById(id: string): Promise<TicketRecord | null> {
    const row = await this.prisma.ticket.findUnique({ where: { id }, include: TICKET_INCLUDE });
    return row ? toRecord(row) : null;
  }

  async list(filter: TicketFilter): Promise<{ items: TicketRecord[]; total: number }> {
    const where: Prisma.TicketWhereInput = {
      ...(filter.requesterId ? { requesterId: filter.requesterId } : {}),
      ...(filter.status ? { status: filter.status } : {}),
      ...(filter.priority ? { priority: filter.priority } : {}),
      ...(filter.categoryId ? { categoryId: filter.categoryId } : {}),
      ...(filter.assigneeId ? { assigneeId: filter.assigneeId } : {}),
      ...(filter.assetId ? { assetId: filter.assetId } : {}),
      ...(filter.from || filter.to
        ? { createdAt: { ...(filter.from ? { gte: filter.from } : {}), ...(filter.to ? { lte: filter.to } : {}) } }
        : {}),
    };

    if (filter.q) {
      const number = /^#?(\d{1,9})$/.exec(filter.q);
      where.OR = [
        { title: { contains: filter.q, mode: 'insensitive' } },
        ...(number ? [{ number: Number(number[1]) }] : []),
      ];
    }

    if (filter.slaBreached !== undefined) {
      const ids = await this.breachedIds(filter.now);
      where.id = filter.slaBreached ? { in: ids } : { notIn: ids };
    }

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.ticket.findMany({
        where,
        include: TICKET_INCLUDE,
        orderBy: [ORDER[filter.sort], { id: 'asc' }],
        skip: filter.skip,
        take: filter.take,
      }),
      this.prisma.ticket.count({ where }),
    ]);
    return { items: rows.map(toRecord), total };
  }

  // Replica a RN-08 em SQL, pois compara duas colunas da mesma linha, o que o
  // filtro do Prisma não expressa. Chamados cancelados ficam fora.
  private async breachedIds(now: Date): Promise<string[]> {
    const rows = await this.prisma.$queryRaw<{ id: string }[]>`
      SELECT "id" FROM "Ticket"
      WHERE "status" <> 'CANCELLED'
        AND (
          ("resolvedAt" IS NOT NULL AND "resolvedAt" > "resolutionDueAt")
          OR ("resolvedAt" IS NULL AND COALESCE("slaPausedAt", ${now}) > "resolutionDueAt")
          OR (COALESCE("firstRespondedAt", ${now}) > "responseDueAt")
        )`;
    return rows.map((r) => r.id);
  }

  async update(
    id: string,
    expectedStatus: TicketStatus,
    data: TicketUpdate,
    history: HistoryEntry[],
    comment?: NewComment,
  ): Promise<TicketRecord> {
    const row = await this.prisma.$transaction(async (tx) => {
      // Trava otimista: só aplica se o status ainda é o que foi lido.
      const result = await tx.ticket.updateMany({ where: { id, status: expectedStatus }, data });
      if (result.count !== 1) {
        throw new ConflictException('O chamado foi alterado por outra pessoa. Recarregue e tente de novo');
      }
      if (history.length > 0) await tx.ticketHistory.createMany({ data: toHistoryRows(id, history) });
      if (comment) await tx.ticketComment.create({ data: { ticketId: id, ...comment } });
      return tx.ticket.findUniqueOrThrow({ where: { id }, include: TICKET_INCLUDE });
    });
    return toRecord(row);
  }

  async listComments(ticketId: string, includeInternal: boolean): Promise<CommentRecord[]> {
    return this.prisma.ticketComment.findMany({
      where: { ticketId, ...(includeInternal ? {} : { internal: false }) },
      select: {
        id: true,
        body: true,
        internal: true,
        createdAt: true,
        author: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async listHistory(ticketId: string): Promise<HistoryRecord[]> {
    return this.prisma.ticketHistory.findMany({
      where: { ticketId },
      select: {
        id: true,
        action: true,
        fromValue: true,
        toValue: true,
        createdAt: true,
        actor: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }
}
