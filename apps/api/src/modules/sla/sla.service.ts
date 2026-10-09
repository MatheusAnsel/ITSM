import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { DEFAULT_SLA, Priority } from '../tickets/ticket.rules';
import { SlaRepository } from './sla.repository';
import { validateSlaPolicy } from './sla.rules';

export const PRIORITY_ORDER: readonly Priority[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

export interface SlaPolicyView {
  priority: Priority;
  firstResponseMinutes: number;
  resolutionMinutes: number;
  // false quando a prioridade ainda usa o padrão da RN-04 (sem linha no banco).
  customized: boolean;
  updatedAt: Date | null;
}

@Injectable()
export class SlaService {
  constructor(private readonly repo: SlaRepository) {}

  async list(): Promise<SlaPolicyView[]> {
    const rows = new Map((await this.repo.list()).map((r) => [r.priority, r]));
    return PRIORITY_ORDER.map((priority) => {
      const row = rows.get(priority);
      return row
        ? { ...row, customized: true }
        : { priority, ...DEFAULT_SLA[priority], customized: false, updatedAt: null };
    });
  }

  async update(
    priority: Priority,
    input: { firstResponseMinutes: number; resolutionMinutes: number },
  ): Promise<SlaPolicyView> {
    const errors = validateSlaPolicy(input.firstResponseMinutes, input.resolutionMinutes);
    if (errors.length > 0) throw new UnprocessableEntityException(errors.join('; '));
    const row = await this.repo.upsert(priority, input);
    return { ...row, customized: true };
  }
}
