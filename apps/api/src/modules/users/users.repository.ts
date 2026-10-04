import { Injectable } from '@nestjs/common';
import type { RoleName } from '../../common/roles';
import { PrismaService } from '../../prisma/prisma.service';

export interface UserView {
  id: string;
  name: string;
  email: string;
  role: RoleName;
  active: boolean;
  createdAt: Date;
}

export interface UserFilter {
  search?: string;
  role?: RoleName;
  skip: number;
  take: number;
}

const SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  active: true,
  createdAt: true,
} as const;

export abstract class UsersRepository {
  abstract list(filter: UserFilter): Promise<{ items: UserView[]; total: number }>;
  abstract listActiveStaff(): Promise<Pick<UserView, 'id' | 'name' | 'role'>[]>;
  abstract findById(id: string): Promise<UserView | null>;
  abstract findByEmail(email: string): Promise<UserView | null>;
  abstract create(data: { name: string; email: string; passwordHash: string; role: RoleName }): Promise<UserView>;
  abstract update(id: string, data: { name?: string; role?: RoleName; active?: boolean }): Promise<UserView>;
  abstract countActiveAdmins(): Promise<number>;
  abstract revokeSessions(userId: string, at: Date): Promise<void>;
}

@Injectable()
export class PrismaUsersRepository extends UsersRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async list(filter: UserFilter): Promise<{ items: UserView[]; total: number }> {
    const where = {
      ...(filter.role ? { role: filter.role } : {}),
      ...(filter.search
        ? {
            OR: [
              { name: { contains: filter.search, mode: 'insensitive' as const } },
              { email: { contains: filter.search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        select: SELECT,
        orderBy: { createdAt: 'desc' },
        skip: filter.skip,
        take: filter.take,
      }),
      this.prisma.user.count({ where }),
    ]);
    return { items, total };
  }

  listActiveStaff(): Promise<Pick<UserView, 'id' | 'name' | 'role'>[]> {
    return this.prisma.user.findMany({
      where: { active: true, role: { in: ['AGENT', 'MANAGER', 'ADMIN'] } },
      select: { id: true, name: true, role: true },
      orderBy: { name: 'asc' },
    });
  }

  findById(id: string): Promise<UserView | null> {
    return this.prisma.user.findUnique({ where: { id }, select: SELECT });
  }

  findByEmail(email: string): Promise<UserView | null> {
    return this.prisma.user.findUnique({ where: { email }, select: SELECT });
  }

  create(data: { name: string; email: string; passwordHash: string; role: RoleName }): Promise<UserView> {
    return this.prisma.user.create({ data, select: SELECT });
  }

  update(id: string, data: { name?: string; role?: RoleName; active?: boolean }): Promise<UserView> {
    return this.prisma.user.update({ where: { id }, data, select: SELECT });
  }

  countActiveAdmins(): Promise<number> {
    return this.prisma.user.count({ where: { role: 'ADMIN', active: true } });
  }

  async revokeSessions(userId: string, at: Date): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: at },
    });
  }
}
