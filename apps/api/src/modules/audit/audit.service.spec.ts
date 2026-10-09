import { Logger } from '@nestjs/common';
import { AuditEntry, AuditFilter, AuditRepository, AuditView } from './audit.repository';
import { AuditService } from './audit.service';

class MemoryAudit extends AuditRepository {
  entries: AuditEntry[] = [];
  lastFilter?: AuditFilter;
  fail = false;
  async create(entry: AuditEntry) {
    if (this.fail) throw new Error('banco fora');
    this.entries.push(entry);
  }
  async list(filter: AuditFilter) {
    this.lastFilter = filter;
    return { items: [] as AuditView[], total: 0 };
  }
}

const entry: AuditEntry = {
  actorId: 'u1',
  action: 'ASSET_CREATED',
  entity: 'Asset',
  entityId: 'a1',
  metadata: null,
  ip: '127.0.0.1',
};

describe('AuditService', () => {
  let repo: MemoryAudit;
  let service: AuditService;

  beforeEach(() => {
    repo = new MemoryAudit();
    service = new AuditService(repo);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });
  afterEach(() => jest.restoreAllMocks());

  it('grava a entrada recebida', async () => {
    await service.record(entry);
    expect(repo.entries).toEqual([entry]);
  });

  it('não propaga falha de gravação', async () => {
    repo.fail = true;
    await expect(service.record(entry)).resolves.toBeUndefined();
  });

  it('calcula o deslocamento da página e repassa os filtros', async () => {
    const result = await service.list({ page: 3, pageSize: 20, entity: 'Ticket', actorId: 'u1' });
    expect(repo.lastFilter).toMatchObject({ skip: 40, take: 20, entity: 'Ticket', actorId: 'u1' });
    expect(result).toMatchObject({ page: 3, pageSize: 20, total: 0 });
  });
});
