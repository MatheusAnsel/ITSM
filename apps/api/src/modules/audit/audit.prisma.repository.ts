import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditEntry, AuditFilter, AuditRepository, AuditView } from './audit.repository';

@Injectable()
export class PrismaAuditRepository extends AuditRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async create(entry: AuditEntry): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        actorId: entry.actorId,
        action: entry.action,
        entity: entry.entity,
        entityId: entry.entityId,
        metadata: (entry.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
        ip: entry.ip,
      },
    });
  }

  async list(filter: AuditFilter): Promise<{ items: AuditView[]; total: number }> {
    const where: Prisma.AuditLogWhereInput = {
      ...(filter.actorId ? { actorId: filter.actorId } : {}),
      ...(filter.action ? { action: filter.action } : {}),
      ...(filter.entity ? { entity: filter.entity } : {}),
      ...(filter.entityId ? { entityId: filter.entityId } : {}),
      ...(filter.from || filter.to ? { createdAt: { gte: filter.from, lte: filter.to } } : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        select: {
          id: true,
          actorId: true,
          action: true,
          entity: true,
          entityId: true,
          metadata: true,
          ip: true,
          createdAt: true,
          actor: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: filter.skip,
        take: filter.take,
      }),
      this.prisma.auditLog.count({ where }),
    ]);
    const items = rows.map((r) => ({
      ...r,
      metadata: r.metadata as Record<string, unknown> | null,
    }));
    return { items, total };
  }
}
