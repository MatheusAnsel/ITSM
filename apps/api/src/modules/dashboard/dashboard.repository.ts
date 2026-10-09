import type { DateRange } from './dashboard.rules';

export interface CountBy<K extends string = string> {
  key: K;
  count: number;
}

export interface SlaAggregate {
  resolved: number;
  resolutionMet: number;
  responseMet: number;
  avgResolutionMinutes: number | null;
}

export interface CategoryRow {
  categoryId: string;
  name: string;
  total: number;
  open: number;
}

export interface AgentRow {
  agentId: string;
  name: string;
  open: number;
  resolved: number;
  avgResolutionMinutes: number | null;
}

export interface VolumeRow {
  day: string;
  created: number;
  resolved: number;
}

export abstract class DashboardRepository {
  abstract countByStatus(range: DateRange): Promise<CountBy[]>;
  abstract countByPriority(range: DateRange): Promise<CountBy[]>;
  abstract slaAggregate(range: DateRange): Promise<SlaAggregate>;
  abstract avgFirstResponseMinutes(range: DateRange): Promise<number | null>;
  // Chamados em aberto cujo prazo de resposta ou de resolução já passou (RN-08).
  abstract countOpenBreached(now: Date): Promise<number>;
  abstract byCategory(range: DateRange): Promise<CategoryRow[]>;
  abstract byAgent(range: DateRange): Promise<AgentRow[]>;
  abstract volume(days: number, now: Date): Promise<VolumeRow[]>;
}
