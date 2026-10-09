import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  AssetCreateData,
  AssetFilter,
  AssetsRepository,
  AssetTicketView,
  AssetUpdateData,
  AssetView,
} from './assets.repository';
import { AssetsService } from './assets.service';

class MemoryAssets extends AssetsRepository {
  assets: AssetView[] = [];
  users = new Map<string, { id: string; active: boolean }>();
  tickets: AssetTicketView[] = [];
  lastFilter?: AssetFilter;
  private seq = 0;

  async list(filter: AssetFilter) {
    this.lastFilter = filter;
    return {
      items: this.assets.slice(filter.skip, filter.skip + filter.take),
      total: this.assets.length,
    };
  }
  async findById(id: string) {
    return this.assets.find((a) => a.id === id) ?? null;
  }
  async findByTag(tag: string) {
    return this.assets.find((a) => a.tag === tag) ?? null;
  }
  async findUser(id: string) {
    return this.users.get(id) ?? null;
  }
  async listTickets() {
    return this.tickets;
  }
  async create(data: AssetCreateData) {
    const asset: AssetView = {
      id: `a${++this.seq}`,
      tag: data.tag,
      name: data.name,
      type: data.type,
      status: data.status,
      serialNumber: data.serialNumber ?? null,
      purchaseDate: data.purchaseDate ?? null,
      notes: data.notes ?? null,
      assignedToId: data.assignedToId,
      assignedTo: data.assignedToId ? { id: data.assignedToId, name: 'Fulano' } : null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.assets.push(asset);
    return asset;
  }
  async update(id: string, data: AssetUpdateData) {
    const asset = this.assets.find((a) => a.id === id)!;
    Object.assign(asset, data);
    if (data.assignedToId !== undefined) {
      asset.assignedTo = data.assignedToId ? { id: data.assignedToId, name: 'Fulano' } : null;
    }
    return asset;
  }
}

describe('AssetsService', () => {
  let repo: MemoryAssets;
  let service: AssetsService;
  const base = { tag: 'nb-0001', name: 'Notebook Dell', type: 'NOTEBOOK' as const };

  beforeEach(() => {
    repo = new MemoryAssets();
    repo.users.set('u1', { id: 'u1', active: true });
    repo.users.set('u-off', { id: 'u-off', active: false });
    service = new AssetsService(repo);
  });

  describe('create', () => {
    it('cadastra em estoque por padrão e normaliza o patrimônio', async () => {
      const asset = await service.create(base);
      expect(asset).toMatchObject({ tag: 'NB-0001', status: 'IN_STOCK', assignedToId: null });
    });

    it('define em uso quando já nasce com responsável', async () => {
      const asset = await service.create({ ...base, assignedToId: 'u1' });
      expect(asset.status).toBe('IN_USE');
    });

    it('rejeita patrimônio repetido, ignorando caixa', async () => {
      await service.create(base);
      await expect(service.create({ ...base, tag: ' NB-0001 ' })).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('rejeita em uso sem responsável e aposentado com responsável', async () => {
      await expect(service.create({ ...base, status: 'IN_USE' })).rejects.toBeInstanceOf(
        UnprocessableEntityException,
      );
      await expect(
        service.create({ ...base, status: 'RETIRED', assignedToId: 'u1' }),
      ).rejects.toBeInstanceOf(UnprocessableEntityException);
    });

    it('rejeita responsável inexistente ou desativado', async () => {
      await expect(service.create({ ...base, assignedToId: 'nope' })).rejects.toThrow(
        'Responsável não encontrado',
      );
      await expect(service.create({ ...base, assignedToId: 'u-off' })).rejects.toThrow(
        'desativado',
      );
    });

    it('converte a data de compra e limpa textos vazios', async () => {
      const asset = await service.create({
        ...base,
        purchaseDate: '2026-03-10',
        serialNumber: '  ',
        notes: ' ok ',
      });
      expect(asset.purchaseDate?.toISOString().slice(0, 10)).toBe('2026-03-10');
      expect(asset.serialNumber).toBeNull();
      expect(asset.notes).toBe('ok');
    });
  });

  describe('update', () => {
    it('exige ao menos um campo', async () => {
      const a = await service.create(base);
      await expect(service.update(a.id, {})).rejects.toBeInstanceOf(BadRequestException);
    });

    it('retorna 404 para ativo inexistente', async () => {
      await expect(service.update('x', { name: 'Novo' })).rejects.toBeInstanceOf(NotFoundException);
    });

    it('impede patrimônio de outro ativo, mas aceita o próprio', async () => {
      const a = await service.create(base);
      await service.create({ ...base, tag: 'NB-0002' });
      await expect(service.update(a.id, { tag: 'nb-0002' })).rejects.toBeInstanceOf(
        ConflictException,
      );
      await expect(service.update(a.id, { tag: 'nb-0001', name: 'Outro' })).resolves.toMatchObject({
        name: 'Outro',
      });
    });

    it('entrega o ativo a um responsável ao colocar em uso', async () => {
      const a = await service.create(base);
      const updated = await service.update(a.id, { status: 'IN_USE', assignedToId: 'u1' });
      expect(updated).toMatchObject({ status: 'IN_USE', assignedToId: 'u1' });
    });

    it('recusa colocar em uso sem responsável', async () => {
      const a = await service.create(base);
      await expect(service.update(a.id, { status: 'IN_USE' })).rejects.toBeInstanceOf(
        UnprocessableEntityException,
      );
    });

    it('remove o responsável ao aposentar', async () => {
      const a = await service.create({ ...base, assignedToId: 'u1' });
      const updated = await service.update(a.id, { status: 'RETIRED' });
      expect(updated).toMatchObject({ status: 'RETIRED', assignedToId: null });
    });

    it('recusa aposentar mantendo responsável explícito', async () => {
      const a = await service.create(base);
      await expect(
        service.update(a.id, { status: 'RETIRED', assignedToId: 'u1' }),
      ).rejects.toBeInstanceOf(UnprocessableEntityException);
    });

    it('devolve ao estoque limpando o responsável com null', async () => {
      const a = await service.create({ ...base, assignedToId: 'u1' });
      const updated = await service.update(a.id, { status: 'IN_STOCK', assignedToId: null });
      expect(updated).toMatchObject({ status: 'IN_STOCK', assignedToId: null });
    });

    it('não revalida o responsável que já era o atual', async () => {
      const a = await service.create({ ...base, assignedToId: 'u1' });
      repo.users.set('u1', { id: 'u1', active: false });
      await expect(service.update(a.id, { name: 'Renomeado' })).resolves.toMatchObject({
        name: 'Renomeado',
      });
    });

    it('permite limpar campos opcionais com null', async () => {
      const a = await service.create({ ...base, notes: 'x', serialNumber: 'S1' });
      const updated = await service.update(a.id, { notes: null, serialNumber: null });
      expect(updated).toMatchObject({ notes: null, serialNumber: null });
    });
  });

  describe('get e list', () => {
    it('devolve o ativo com os chamados vinculados', async () => {
      const a = await service.create(base);
      repo.tickets = [
        {
          id: 't1',
          number: 1,
          title: 'Tela quebrada',
          status: 'OPEN',
          priority: 'HIGH',
          createdAt: new Date(),
        },
      ];
      const detail = await service.get(a.id);
      expect(detail.tickets).toHaveLength(1);
      await expect(service.get('x')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('calcula o deslocamento da página e ignora busca vazia', async () => {
      await service.list({ page: 3, pageSize: 10, search: '' });
      expect(repo.lastFilter).toMatchObject({ skip: 20, take: 10, search: undefined });
    });
  });
});
