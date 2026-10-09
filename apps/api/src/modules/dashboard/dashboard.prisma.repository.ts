import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  AgentRow,
  CategoryRow,
  CountBy,
  DashboardRepository,
  SlaAggregate,
  VolumeRow,
} from './dashboard.repository';
import type { DateRange } from './dashboard.rules';

// Contagens e médias vêm como bigint/numeric do Postgres; convertidas aqui para number.
const num = (value: unknown): number => Number(value ?? 0);
const numOrNull = (value: unknown): number | null =>
  value === null || value === undefined ? null : Number(value);

@Injectable()
export class PrismaDashboardRepository extends DashboardRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async countByStatus(range: DateRange): Promise<CountBy[]> {
    const rows = await this.prisma.ticket.groupBy({
      by: ['status'],
      where: { createdAt: { gte: range.from, lte: range.to } },
      _count: { _all: true },
    });
    return rows.map((r) => ({ key: r.status, count: r._count._all }));
  }

  async countByPriority(range: DateRange): Promise<CountBy[]> {
    const rows = await this.prisma.ticket.groupBy({
      by: ['priority'],
      where: { createdAt: { gte: range.from, lte: range.to } },
      _count: { _all: true },
    });
    return rows.map((r) => ({ key: r.priority, count: r._count._all }));
  }

  // RN-08: o cumprimento considera apenas chamados resolvidos no período; cancelados ficam fora.
  async slaAggregate(range: DateRange): Promise<SlaAggregate> {
    const [row] = await this.prisma.$queryRaw<Record<string, unknown>[]>`
      SELECT COUNT(*)::int AS "resolved",
        (COUNT(*) FILTER (WHERE "resolvedAt" <= "resolutionDueAt"))::int AS "resolutionMet",
        (COUNT(*) FILTER (WHERE COALESCE("firstRespondedAt", "resolvedAt") <= "responseDueAt"))::int AS "responseMet",
        AVG(EXTRACT(EPOCH FROM ("resolvedAt" - "createdAt")) / 60)::float AS "avgResolutionMinutes"
      FROM "Ticket"
      WHERE "status" <> 'CANCELLED' AND "resolvedAt" >= ${range.from} AND "resolvedAt" <= ${range.to}`;
    return {
      resolved: num(row?.resolved),
      resolutionMet: num(row?.resolutionMet),
      responseMet: num(row?.responseMet),
      avgResolutionMinutes: numOrNull(row?.avgResolutionMinutes),
    };
  }

  async avgFirstResponseMinutes(range: DateRange): Promise<number | null> {
    const [row] = await this.prisma.$queryRaw<Record<string, unknown>[]>`
      SELECT AVG(EXTRACT(EPOCH FROM ("firstRespondedAt" - "createdAt")) / 60)::float AS "avg"
      FROM "Ticket"
      WHERE "status" <> 'CANCELLED' AND "firstRespondedAt" IS NOT NULL
        AND "createdAt" >= ${range.from} AND "createdAt" <= ${range.to}`;
    return numOrNull(row?.avg);
  }

  async countOpenBreached(now: Date): Promise<number> {
    const [row] = await this.prisma.$queryRaw<Record<string, unknown>[]>`
      SELECT COUNT(*)::int AS "n" FROM "Ticket"
      WHERE "status" IN ('OPEN', 'IN_PROGRESS', 'WAITING_USER')
        AND (
          COALESCE("slaPausedAt", ${now}) > "resolutionDueAt"
          OR COALESCE("firstRespondedAt", ${now}) > "responseDueAt"
        )`;
    return num(row?.n);
  }

  async byCategory(range: DateRange): Promise<CategoryRow[]> {
    const rows = await this.prisma.$queryRaw<Record<string, unknown>[]>`
      SELECT c."id" AS "categoryId", c."name" AS "name",
        COUNT(t."id")::int AS "total",
        (COUNT(t."id") FILTER (WHERE t."status" IN ('OPEN', 'IN_PROGRESS', 'WAITING_USER')))::int AS "open"
      FROM "Category" c
      JOIN "Ticket" t ON t."categoryId" = c."id"
        AND t."createdAt" >= ${range.from} AND t."createdAt" <= ${range.to}
      GROUP BY c."id", c."name"
      ORDER BY "total" DESC, c."name" ASC`;
    return rows.map((r) => ({
      categoryId: String(r.categoryId),
      name: String(r.name),
      total: num(r.total),
      open: num(r.open),
    }));
  }

  async byAgent(range: DateRange): Promise<AgentRow[]> {
    const rows = await this.prisma.$queryRaw<Record<string, unknown>[]>`
      SELECT u."id" AS "agentId", u."name" AS "name",
        (COUNT(t."id") FILTER (WHERE t."status" IN ('OPEN', 'IN_PROGRESS', 'WAITING_USER')))::int AS "open",
        (COUNT(t."id") FILTER (WHERE t."resolvedAt" >= ${range.from} AND t."resolvedAt" <= ${range.to}))::int AS "resolved",
        (AVG(EXTRACT(EPOCH FROM (t."resolvedAt" - t."createdAt")) / 60)
          FILTER (WHERE t."resolvedAt" >= ${range.from} AND t."resolvedAt" <= ${range.to}))::float AS "avgResolutionMinutes"
      FROM "User" u
      JOIN "Ticket" t ON t."assigneeId" = u."id" AND t."status" <> 'CANCELLED'
      WHERE u."role" IN ('AGENT', 'MANAGER', 'ADMIN') AND u."active" = true
      GROUP BY u."id", u."name"
      ORDER BY "open" DESC, u."name" ASC`;
    return rows.map((r) => ({
      agentId: String(r.agentId),
      name: String(r.name),
      open: num(r.open),
      resolved: num(r.resolved),
      avgResolutionMinutes: numOrNull(r.avgResolutionMinutes),
    }));
  }

  // Dias em UTC, incluindo os sem movimento (zeros), do mais antigo ao de hoje.
  async volume(days: number, now: Date): Promise<VolumeRow[]> {
    const rows = await this.prisma.$queryRaw<Record<string, unknown>[]>`
      SELECT to_char(d::date, 'YYYY-MM-DD') AS "day",
        (SELECT COUNT(*)::int FROM "Ticket" t WHERE (t."createdAt" AT TIME ZONE 'UTC')::date = d::date) AS "created",
        (SELECT COUNT(*)::int FROM "Ticket" t WHERE (t."resolvedAt" AT TIME ZONE 'UTC')::date = d::date) AS "resolved"
      FROM generate_series(
        (${now}::timestamp AT TIME ZONE 'UTC')::date - ${days - 1}::int,
        (${now}::timestamp AT TIME ZONE 'UTC')::date,
        interval '1 day'
      ) AS d
      ORDER BY d`;
    return rows.map((r) => ({
      day: String(r.day),
      created: num(r.created),
      resolved: num(r.resolved),
    }));
  }
}
