import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { RoleName } from '../../common/roles';

export interface UserRecord {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: RoleName;
  active: boolean;
}

export interface RefreshRecord {
  id: string;
  userId: string;
  expiresAt: Date;
  revokedAt: Date | null;
}

// Porta de persistência: o serviço depende desta interface, não do Prisma,
// o que permite testar as regras de sessão sem banco (RNF-07).
export abstract class AuthRepository {
  abstract findUserByEmail(email: string): Promise<UserRecord | null>;
  abstract findUserById(id: string): Promise<UserRecord | null>;
  abstract createUser(data: {
    name: string;
    email: string;
    passwordHash: string;
  }): Promise<UserRecord>;
  abstract updatePassword(userId: string, passwordHash: string): Promise<void>;
  abstract saveRefreshToken(data: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<void>;
  abstract findRefreshToken(tokenHash: string): Promise<RefreshRecord | null>;
  abstract revokeRefreshToken(id: string, at: Date): Promise<boolean>;
  abstract revokeAllForUser(userId: string, at: Date): Promise<void>;
}

@Injectable()
export class PrismaAuthRepository extends AuthRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  findUserByEmail(email: string): Promise<UserRecord | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  findUserById(id: string): Promise<UserRecord | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  createUser(data: { name: string; email: string; passwordHash: string }): Promise<UserRecord> {
    return this.prisma.user.create({ data });
  }

  async updatePassword(userId: string, passwordHash: string): Promise<void> {
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash } });
  }

  async saveRefreshToken(data: { userId: string; tokenHash: string; expiresAt: Date }): Promise<void> {
    await this.prisma.refreshToken.create({ data });
  }

  findRefreshToken(tokenHash: string): Promise<RefreshRecord | null> {
    return this.prisma.refreshToken.findUnique({ where: { tokenHash } });
  }

  // Atômico: só revoga se ainda não estava revogado, evitando corrida em
  // dois refresh simultâneos com o mesmo token.
  async revokeRefreshToken(id: string, at: Date): Promise<boolean> {
    const result = await this.prisma.refreshToken.updateMany({
      where: { id, revokedAt: null },
      data: { revokedAt: at },
    });
    return result.count === 1;
  }

  async revokeAllForUser(userId: string, at: Date): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: at },
    });
  }
}
