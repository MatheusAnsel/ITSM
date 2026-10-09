import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  AssetCreateData,
  AssetFilter,
  AssetsRepository,
  AssetTicketView,
  AssetUpdateData,
  AssetView,
} from './assets.repository';

const SELECT = {
  id: true,
  tag: true,
  name: true,
  type: true,
  status: true,
  serialNumber: true,
  purchaseDate: true,
  notes: true,
  assignedToId: true,
  assignedTo: { select: { id: true, name: true } },
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class PrismaAssetsRepository extends AssetsRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async list(filter: AssetFilter): Promise<{ items: AssetView[]; total: number }> {
    const where = {
      ...(filter.type ? { type: filter.type } : {}),
      ...(filter.status ? { status: filter.status } : {}),
      ...(filter.assignedToId ? { assignedToId: filter.assignedToId } : {}),
      ...(filter.search
        ? {
            OR: [
              { tag: { contains: filter.search, mode: 'insensitive' as const } },
              { name: { contains: filter.search, mode: 'insensitive' as const } },
              { serialNumber: { contains: filter.search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.asset.findMany({
        where,
        select: SELECT,
        orderBy: { createdAt: 'desc' },
        skip: filter.skip,
        take: filter.take,
      }),
      this.prisma.asset.count({ where }),
    ]);
    return { items, total };
  }

  findById(id: string): Promise<AssetView | null> {
    return this.prisma.asset.findUnique({ where: { id }, select: SELECT });
  }

  findByTag(tag: string): Promise<AssetView | null> {
    return this.prisma.asset.findUnique({ where: { tag }, select: SELECT });
  }

  findUser(id: string): Promise<{ id: string; active: boolean } | null> {
    return this.prisma.user.findUnique({ where: { id }, select: { id: true, active: true } });
  }

  listTickets(assetId: string): Promise<AssetTicketView[]> {
    return this.prisma.ticket.findMany({
      where: { assetId },
      select: {
        id: true,
        number: true,
        title: true,
        status: true,
        priority: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  create(data: AssetCreateData): Promise<AssetView> {
    return this.prisma.asset.create({ data, select: SELECT });
  }

  update(id: string, data: AssetUpdateData): Promise<AssetView> {
    return this.prisma.asset.update({ where: { id }, data, select: SELECT });
  }
}
