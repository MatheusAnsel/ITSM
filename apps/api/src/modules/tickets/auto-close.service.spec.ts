import { AutoCloseRepository } from './auto-close.repository';
import { AutoCloseService } from './auto-close.service';
import { AUTO_CLOSE_DAYS, autoCloseCutoff } from './ticket.rules';

const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date('2026-10-09T12:00:00Z');

interface Row {
  id: string;
  status: 'RESOLVED' | 'CLOSED' | 'IN_PROGRESS';
  resolvedAt: Date | null;
}

class MemoryAutoClose extends AutoCloseRepository {
  systemUser: string | null = 'sys';
  rows: Row[] = [];
  history: { id: string; actor: string }[] = [];
  async findSystemUserId() {
    return this.systemUser;
  }
  async findDueIds(cutoff: Date, limit: number) {
    return this.rows
      .filter((r) => r.status === 'RESOLVED' && r.resolvedAt && r.resolvedAt <= cutoff)
      .slice(0, limit)
      .map((r) => r.id);
  }
  async close(id: string, cutoff: Date, systemUserId: string) {
    const row = this.rows.find((r) => r.id === id);
    if (!row || row.status !== 'RESOLVED' || !row.resolvedAt || row.resolvedAt > cutoff)
      return false;
    row.status = 'CLOSED';
    this.history.push({ id, actor: systemUserId });
    return true;
  }
}

describe('autoCloseCutoff', () => {
  it('recua o prazo da RN-07 a partir de agora', () => {
    expect(autoCloseCutoff(NOW).getTime()).toBe(NOW.getTime() - AUTO_CLOSE_DAYS * DAY);
  });
});

describe('AutoCloseService (RN-07)', () => {
  let repo: MemoryAutoClose;
  let service: AutoCloseService;

  beforeEach(() => {
    repo = new MemoryAutoClose();
    service = new AutoCloseService(repo, 0);
  });

  it('fecha só os resolvidos há 3 dias ou mais e registra o usuário de sistema', async () => {
    repo.rows = [
      { id: 'velho', status: 'RESOLVED', resolvedAt: new Date(NOW.getTime() - 3 * DAY) },
      { id: 'mais-velho', status: 'RESOLVED', resolvedAt: new Date(NOW.getTime() - 10 * DAY) },
      { id: 'recente', status: 'RESOLVED', resolvedAt: new Date(NOW.getTime() - 2 * DAY) },
      { id: 'aberto', status: 'IN_PROGRESS', resolvedAt: null },
    ];
    expect(await service.run(NOW)).toBe(2);
    expect(repo.rows.map((r) => [r.id, r.status])).toEqual([
      ['velho', 'CLOSED'],
      ['mais-velho', 'CLOSED'],
      ['recente', 'RESOLVED'],
      ['aberto', 'IN_PROGRESS'],
    ]);
    expect(repo.history).toEqual([
      { id: 'velho', actor: 'sys' },
      { id: 'mais-velho', actor: 'sys' },
    ]);
  });

  it('é idempotente: uma segunda execução não fecha nada', async () => {
    repo.rows = [{ id: 'a', status: 'RESOLVED', resolvedAt: new Date(NOW.getTime() - 4 * DAY) }];
    expect(await service.run(NOW)).toBe(1);
    expect(await service.run(NOW)).toBe(0);
    expect(repo.history).toHaveLength(1);
  });

  it('não fecha nada sem o usuário de sistema', async () => {
    repo.systemUser = null;
    repo.rows = [{ id: 'a', status: 'RESOLVED', resolvedAt: new Date(NOW.getTime() - 4 * DAY) }];
    expect(await service.run(NOW)).toBe(0);
    expect(repo.rows[0].status).toBe('RESOLVED');
  });

  it('processa mais de um lote', async () => {
    repo.rows = Array.from({ length: 250 }, (_, i) => ({
      id: `t${i}`,
      status: 'RESOLVED' as const,
      resolvedAt: new Date(NOW.getTime() - 5 * DAY),
    }));
    expect(await service.run(NOW)).toBe(250);
  });

  it('encerra quando outra instância já fechou os chamados do lote', async () => {
    repo.rows = [{ id: 'a', status: 'RESOLVED', resolvedAt: new Date(NOW.getTime() - 4 * DAY) }];
    jest.spyOn(repo, 'close').mockResolvedValue(false);
    expect(await service.run(NOW)).toBe(0);
  });
});
