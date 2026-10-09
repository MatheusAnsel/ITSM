import { Injectable } from '@nestjs/common';
import { SYSTEM_USER_EMAIL } from '../../common/system-user';
import { PrismaService } from '../../prisma/prisma.service';
import { AutoCloseRepository } from './auto-close.repository';

@Injectable()
export class PrismaAutoCloseRepository extends AutoCloseRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findSystemUserId(): Promise<string | null> {
    const user = await this.prisma.user.findUnique({
      where: { email: SYSTEM_USER_EMAIL },
      select: { id: true },
    });
    return user?.id ?? null;
  }

  async findDueIds(cutoff: Date, limit: number): Promise<string[]> {
    const rows = await this.prisma.ticket.findMany({
      where: { status: 'RESOLVED', resolvedAt: { lte: cutoff } },
      select: { id: true },
      orderBy: { resolvedAt: 'asc' },
      take: limit,
    });
    return rows.map((r) => r.id);
  }

  close(id: string, cutoff: Date, systemUserId: string, now: Date): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      // Trava otimista: só fecha se ainda está resolvido e dentro da regra.
      const result = await tx.ticket.updateMany({
        where: { id, status: 'RESOLVED', resolvedAt: { lte: cutoff } },
        data: { status: 'CLOSED', closedAt: now },
      });
      if (result.count !== 1) return false;
      await tx.ticketHistory.create({
        data: {
          ticketId: id,
          actorId: systemUserId,
          action: 'STATUS_CHANGED',
          fromValue: 'RESOLVED',
          toValue: 'CLOSED',
        },
      });
      return true;
    });
  }
}
