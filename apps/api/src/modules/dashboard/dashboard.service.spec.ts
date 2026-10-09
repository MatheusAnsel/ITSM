import { BadRequestException } from '@nestjs/common';
import {
  AgentRow,
  CategoryRow,
  CountBy,
  DashboardRepository,
  SlaAggregate,
  VolumeRow,
} from './dashboard.repository';
import { DashboardService, VOLUME_DAYS } from './dashboard.service';

const NOW = new Date('2026-10-09T12:00:00Z');

class MemoryDashboard extends DashboardRepository {
  statuses: CountBy[] = [];
  priorities: CountBy[] = [];
  sla: SlaAggregate = { resolved: 0, resolutionMet: 0, responseMet: 0, avgResolutionMinutes: null };
  avgResponse: number | null = null;
  breached = 0;
  agents: AgentRow[] = [];
  volumeArgs?: { days: number; now: Date };
  async countByStatus() {
    return this.statuses;
  }
  async countByPriority() {
    return this.priorities;
  }
  async slaAggregate() {
    return this.sla;
  }
  async avgFirstResponseMinutes() {
    return this.avgResponse;
  }
  async countOpenBreached() {
    return this.breached;
  }
  async byCategory(): Promise<CategoryRow[]> {
    return [];
  }
  async byAgent() {
    return this.agents;
  }
  async volume(days: number, now: Date): Promise<VolumeRow[]> {
    this.volumeArgs = { days, now };
    return [];
  }
}

describe('DashboardService', () => {
  let repo: MemoryDashboard;
  let service: DashboardService;

  beforeEach(() => {
    repo = new MemoryDashboard();
    service = new DashboardService(repo, () => NOW);
  });

  it('devolve todas as chaves de status e prioridade, com zero quando não há chamados', async () => {
    repo.statuses = [
      { key: 'OPEN', count: 3 },
      { key: 'RESOLVED', count: 2 },
    ];
    const s = await service.summary();
    expect(s.byStatus).toEqual({
      OPEN: 3,
      IN_PROGRESS: 0,
      WAITING_USER: 0,
      RESOLVED: 2,
      CLOSED: 0,
      CANCELLED: 0,
    });
    expect(s.byPriority).toEqual({ LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 });
    expect(s.totalCreated).toBe(5);
  });

  it('calcula o cumprimento de SLA sobre os resolvidos do período (RN-08)', async () => {
    repo.sla = { resolved: 8, resolutionMet: 6, responseMet: 7, avgResolutionMinutes: 125.4 };
    repo.avgResponse = 29.6;
    repo.breached = 2;
    const s = await service.summary();
    expect(s.sla).toEqual({
      resolvedInPeriod: 8,
      resolutionCompliancePercent: 75,
      responseCompliancePercent: 87.5,
      openBreached: 2,
    });
    expect(s.averages).toEqual({ firstResponseMinutes: 30, resolutionMinutes: 125 });
  });

  it('não inventa percentual quando nada foi resolvido', async () => {
    const s = await service.summary();
    expect(s.sla.resolutionCompliancePercent).toBeNull();
    expect(s.sla.responseCompliancePercent).toBeNull();
    expect(s.averages).toEqual({ firstResponseMinutes: null, resolutionMinutes: null });
  });

  it('recusa período inválido', async () => {
    await expect(
      service.summary(new Date('2026-10-02'), new Date('2026-10-01')),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.byCategory(new Date('2020-01-01'), new Date('2026-01-01')),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('arredonda o tempo médio por atendente', async () => {
    repo.agents = [{ agentId: 'a', name: 'Ana', open: 1, resolved: 2, avgResolutionMinutes: 59.5 }];
    expect((await service.byAgent())[0].avgResolutionMinutes).toBe(60);
  });

  it('pede o volume dos últimos 30 dias a partir de agora', async () => {
    await service.volume();
    expect(repo.volumeArgs).toEqual({ days: VOLUME_DAYS, now: NOW });
  });
});
