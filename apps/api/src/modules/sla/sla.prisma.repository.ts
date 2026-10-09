import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { Priority } from '../tickets/ticket.rules';
import { SlaPolicyRow, SlaRepository } from './sla.repository';

const SELECT = {
  priority: true,
  firstResponseMinutes: true,
  resolutionMinutes: true,
  updatedAt: true,
} as const;

@Injectable()
export class PrismaSlaRepository extends SlaRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  list(): Promise<SlaPolicyRow[]> {
    return this.prisma.slaPolicy.findMany({ select: SELECT });
  }

  upsert(
    priority: Priority,
    data: { firstResponseMinutes: number; resolutionMinutes: number },
  ): Promise<SlaPolicyRow> {
    return this.prisma.slaPolicy.upsert({
      where: { priority },
      create: { priority, ...data },
      update: data,
      select: SELECT,
    });
  }
}
