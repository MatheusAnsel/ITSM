import { BadRequestException, Injectable } from '@nestjs/common';
import { PRIORITIES, TICKET_STATUSES } from '../tickets/ticket.rules';
import {
  AgentRow,
  CategoryRow,
  CountBy,
  DashboardRepository,
  VolumeRow,
} from './dashboard.repository';
import { percentage, resolveRange, roundMinutes } from './dashboard.rules';

export const VOLUME_DAYS = 30;

export interface DashboardSummary {
  period: { from: Date; to: Date };
  byStatus: Record<string, number>;
  byPriority: Record<string, number>;
  totalCreated: number;
  sla: {
    resolvedInPeriod: number;
    resolutionCompliancePercent: number | null;
    responseCompliancePercent: number | null;
    openBreached: number;
  };
  averages: { firstResponseMinutes: number | null; resolutionMinutes: number | null };
}

// Garante todas as chaves, inclusive as sem chamados, para o frontend não tratar ausência.
function fill(keys: readonly string[], rows: CountBy[]): Record<string, number> {
  const out = Object.fromEntries(keys.map((k) => [k, 0]));
  for (const row of rows) out[row.key] = row.count;
  return out;
}

@Injectable()
export class DashboardService {
  constructor(
    private readonly repo: DashboardRepository,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async summary(from?: Date, to?: Date): Promise<DashboardSummary> {
    const range = this.range(from, to);
    const [statuses, priorities, sla, avgResponse, openBreached] = await Promise.all([
      this.repo.countByStatus(range),
      this.repo.countByPriority(range),
      this.repo.slaAggregate(range),
      this.repo.avgFirstResponseMinutes(range),
      this.repo.countOpenBreached(this.now()),
    ]);
    const byStatus = fill(TICKET_STATUSES, statuses);
    return {
      period: range,
      byStatus,
      byPriority: fill(PRIORITIES, priorities),
      totalCreated: Object.values(byStatus).reduce((a, b) => a + b, 0),
      sla: {
        resolvedInPeriod: sla.resolved,
        resolutionCompliancePercent: percentage(sla.resolutionMet, sla.resolved),
        responseCompliancePercent: percentage(sla.responseMet, sla.resolved),
        openBreached,
      },
      averages: {
        firstResponseMinutes: roundMinutes(avgResponse),
        resolutionMinutes: roundMinutes(sla.avgResolutionMinutes),
      },
    };
  }

  async byCategory(from?: Date, to?: Date): Promise<CategoryRow[]> {
    return this.repo.byCategory(this.range(from, to));
  }

  async byAgent(from?: Date, to?: Date): Promise<AgentRow[]> {
    const rows = await this.repo.byAgent(this.range(from, to));
    return rows.map((r) => ({ ...r, avgResolutionMinutes: roundMinutes(r.avgResolutionMinutes) }));
  }

  volume(): Promise<VolumeRow[]> {
    return this.repo.volume(VOLUME_DAYS, this.now());
  }

  private range(from?: Date, to?: Date) {
    const { range, error } = resolveRange(from, to, this.now());
    if (!range) throw new BadRequestException(error);
    return range;
  }
}
