import { UnprocessableEntityException } from '@nestjs/common';
import { DEFAULT_SLA, Priority } from '../tickets/ticket.rules';
import { SlaPolicyRow, SlaRepository } from './sla.repository';
import { SlaService } from './sla.service';

class MemorySla extends SlaRepository {
  rows = new Map<Priority, SlaPolicyRow>();
  async list() {
    return [...this.rows.values()];
  }
  async upsert(
    priority: Priority,
    data: { firstResponseMinutes: number; resolutionMinutes: number },
  ) {
    const row = { priority, ...data, updatedAt: new Date('2026-10-09T12:00:00Z') };
    this.rows.set(priority, row);
    return row;
  }
}

describe('SlaService', () => {
  let repo: MemorySla;
  let service: SlaService;

  beforeEach(() => {
    repo = new MemorySla();
    service = new SlaService(repo);
  });

  it('lista as quatro prioridades em ordem, usando o padrão da RN-04 quando não há registro', async () => {
    const list = await service.list();
    expect(list.map((p) => p.priority)).toEqual(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']);
    expect(list[0]).toMatchObject({ ...DEFAULT_SLA.CRITICAL, customized: false, updatedAt: null });
  });

  it('marca como personalizada a prioridade já alterada', async () => {
    await service.update('HIGH', { firstResponseMinutes: 30, resolutionMinutes: 240 });
    const high = (await service.list()).find((p) => p.priority === 'HIGH');
    expect(high).toMatchObject({
      firstResponseMinutes: 30,
      resolutionMinutes: 240,
      customized: true,
    });
    expect((await service.list()).find((p) => p.priority === 'LOW')?.customized).toBe(false);
  });

  it('atualiza uma política existente', async () => {
    await service.update('LOW', { firstResponseMinutes: 60, resolutionMinutes: 600 });
    const updated = await service.update('LOW', {
      firstResponseMinutes: 120,
      resolutionMinutes: 900,
    });
    expect(updated).toMatchObject({ firstResponseMinutes: 120, resolutionMinutes: 900 });
    expect(repo.rows.size).toBe(1);
  });

  it('rejeita primeira resposta maior que a resolução', async () => {
    await expect(
      service.update('LOW', { firstResponseMinutes: 600, resolutionMinutes: 60 }),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
    expect(repo.rows.size).toBe(0);
  });

  it('aceita primeira resposta igual à resolução', async () => {
    await expect(
      service.update('LOW', { firstResponseMinutes: 60, resolutionMinutes: 60 }),
    ).resolves.toBeDefined();
  });
});
