import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  AssetCreateData,
  AssetsRepository,
  AssetTicketView,
  AssetUpdateData,
  AssetView,
} from './assets.repository';
import {
  AssetStatusName,
  AssetTypeName,
  normalizeTag,
  resolveAssignee,
  validateAssetState,
} from './assets.rules';

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AssetListQuery {
  type?: AssetTypeName;
  status?: AssetStatusName;
  assignedToId?: string;
  search?: string;
  page: number;
  pageSize: number;
}

export interface AssetInput {
  tag: string;
  name: string;
  type: AssetTypeName;
  status?: AssetStatusName;
  serialNumber?: string;
  purchaseDate?: string;
  notes?: string;
  assignedToId?: string;
}

export interface AssetChange {
  tag?: string;
  name?: string;
  type?: AssetTypeName;
  status?: AssetStatusName;
  serialNumber?: string | null;
  purchaseDate?: string | null;
  notes?: string | null;
  assignedToId?: string | null;
}

@Injectable()
export class AssetsService {
  constructor(private readonly repo: AssetsRepository) {}

  async list(query: AssetListQuery): Promise<Page<AssetView>> {
    const { items, total } = await this.repo.list({
      type: query.type,
      status: query.status,
      assignedToId: query.assignedToId,
      search: query.search || undefined,
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    });
    return { items, total, page: query.page, pageSize: query.pageSize };
  }

  async get(id: string): Promise<AssetView & { tickets: AssetTicketView[] }> {
    const asset = await this.repo.findById(id);
    if (!asset) throw new NotFoundException('Ativo não encontrado');
    return { ...asset, tickets: await this.repo.listTickets(id) };
  }

  async create(input: AssetInput): Promise<AssetView> {
    const tag = normalizeTag(input.tag);
    if (await this.repo.findByTag(tag))
      throw new ConflictException('Já existe um ativo com esse patrimônio');
    const status = input.status ?? (input.assignedToId ? 'IN_USE' : 'IN_STOCK');
    const assignedToId = input.assignedToId ?? null;
    this.assertState(status, assignedToId);
    if (assignedToId) await this.assertAssignee(assignedToId);
    const data: AssetCreateData = {
      tag,
      name: input.name.trim(),
      type: input.type,
      status,
      serialNumber: input.serialNumber?.trim() || null,
      purchaseDate: input.purchaseDate ? new Date(input.purchaseDate) : null,
      notes: input.notes?.trim() || null,
      assignedToId,
    };
    return this.repo.create(data);
  }

  async update(id: string, change: AssetChange): Promise<AssetView> {
    if (Object.values(change).every((v) => v === undefined)) {
      throw new BadRequestException('Informe ao menos um campo para alterar');
    }
    const current = await this.repo.findById(id);
    if (!current) throw new NotFoundException('Ativo não encontrado');

    const data: AssetUpdateData = {};
    if (change.tag !== undefined) {
      const tag = normalizeTag(change.tag);
      const clash = await this.repo.findByTag(tag);
      if (clash && clash.id !== id)
        throw new ConflictException('Já existe um ativo com esse patrimônio');
      data.tag = tag;
    }
    if (change.name !== undefined) data.name = change.name.trim();
    if (change.type !== undefined) data.type = change.type;
    if (change.serialNumber !== undefined) data.serialNumber = change.serialNumber?.trim() || null;
    if (change.notes !== undefined) data.notes = change.notes?.trim() || null;
    if (change.purchaseDate !== undefined)
      data.purchaseDate = change.purchaseDate ? new Date(change.purchaseDate) : null;

    const status = change.status ?? current.status;
    const assignedToId = resolveAssignee(status, current.assignedToId, change.assignedToId);
    this.assertState(status, assignedToId);
    if (assignedToId && assignedToId !== current.assignedToId)
      await this.assertAssignee(assignedToId);
    if (status !== current.status) data.status = status;
    if (assignedToId !== current.assignedToId) data.assignedToId = assignedToId;

    return this.repo.update(id, data);
  }

  private assertState(status: AssetStatusName, assignedToId: string | null): void {
    const errors = validateAssetState(status, assignedToId);
    if (errors.length > 0) throw new UnprocessableEntityException(errors.join('; '));
  }

  private async assertAssignee(userId: string): Promise<void> {
    const user = await this.repo.findUser(userId);
    if (!user) throw new UnprocessableEntityException('Responsável não encontrado');
    if (!user.active) throw new UnprocessableEntityException('Responsável está desativado');
  }
}
