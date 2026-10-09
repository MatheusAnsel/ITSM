import type { Priority } from '../tickets/ticket.rules';

export interface SlaPolicyRow {
  priority: Priority;
  firstResponseMinutes: number;
  resolutionMinutes: number;
  updatedAt: Date;
}

export abstract class SlaRepository {
  abstract list(): Promise<SlaPolicyRow[]>;
  abstract upsert(
    priority: Priority,
    data: { firstResponseMinutes: number; resolutionMinutes: number },
  ): Promise<SlaPolicyRow>;
}
