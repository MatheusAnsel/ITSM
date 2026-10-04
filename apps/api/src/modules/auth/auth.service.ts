import {
  ConflictException,
  Injectable,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import type { RoleName } from '../../common/roles';
import {
  BCRYPT_COST,
  decideRefresh,
  generateRefreshToken,
  hashToken,
  normalizeEmail,
  refreshExpiry,
  validatePassword,
} from './auth.rules';
import { AuthRepository, UserRecord } from './auth.repository';

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  role: RoleName;
}

export interface Session {
  accessToken: string;
  refreshToken: string;
  refreshExpiresAt: Date;
  user: PublicUser;
}

export interface AccessPayload {
  sub: string;
  role: RoleName;
}

export const AUTH_OPTIONS = Symbol('AUTH_OPTIONS');
export interface AuthOptions {
  refreshTtlDays: number;
}

// Hash fictício usado para igualar o tempo de resposta quando o e-mail
// não existe, dificultando enumeração de usuários por temporização.
const DUMMY_HASH = bcrypt.hashSync('senha-fictícia-para-timing', BCRYPT_COST);

const INVALID_CREDENTIALS = 'E-mail ou senha inválidos';

@Injectable()
export class AuthService {
  constructor(
    private readonly repo: AuthRepository,
    private readonly jwt: JwtService,
    private readonly options: AuthOptions,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async register(input: { name: string; email: string; password: string }): Promise<Session> {
    this.assertPassword(input.password);
    const email = normalizeEmail(input.email);
    if (await this.repo.findUserByEmail(email)) {
      throw new ConflictException('E-mail já cadastrado');
    }
    const passwordHash = await bcrypt.hash(input.password, BCRYPT_COST);
    const user = await this.repo.createUser({ name: input.name.trim(), email, passwordHash });
    return this.issueSession(user);
  }

  async login(input: { email: string; password: string }): Promise<Session> {
    const user = await this.repo.findUserByEmail(normalizeEmail(input.email));
    const valid = await bcrypt.compare(input.password, user?.passwordHash ?? DUMMY_HASH);
    // RF-08: usuário desativado não autentica; mesma mensagem genérica.
    if (!user || !valid || !user.active) {
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }
    return this.issueSession(user);
  }

  async refresh(token: string | undefined): Promise<Session> {
    if (!token) throw new UnauthorizedException('Sessão inválida');
    const stored = await this.repo.findRefreshToken(hashToken(token));
    if (!stored) throw new UnauthorizedException('Sessão inválida');

    const now = this.now();
    const decision = decideRefresh(stored, now);
    if (decision === 'REUSE_DETECTED') {
      await this.repo.revokeAllForUser(stored.userId, now);
      throw new UnauthorizedException('Sessão inválida');
    }
    if (decision === 'EXPIRED') throw new UnauthorizedException('Sessão expirada');

    const user = await this.repo.findUserById(stored.userId);
    if (!user || !user.active) throw new UnauthorizedException('Sessão inválida');

    // Se outra requisição já consumiu o token, tratamos como reuso.
    const revoked = await this.repo.revokeRefreshToken(stored.id, now);
    if (!revoked) {
      await this.repo.revokeAllForUser(stored.userId, now);
      throw new UnauthorizedException('Sessão inválida');
    }
    return this.issueSession(user);
  }

  async logout(token: string | undefined): Promise<void> {
    if (!token) return;
    const stored = await this.repo.findRefreshToken(hashToken(token));
    if (stored && !stored.revokedAt) {
      await this.repo.revokeRefreshToken(stored.id, this.now());
    }
  }

  async me(userId: string): Promise<PublicUser> {
    const user = await this.repo.findUserById(userId);
    if (!user || !user.active) throw new UnauthorizedException('Sessão inválida');
    return toPublic(user);
  }

  async changePassword(
    userId: string,
    input: { currentPassword: string; newPassword: string },
  ): Promise<void> {
    const user = await this.repo.findUserById(userId);
    if (!user || !user.active) throw new UnauthorizedException('Sessão inválida');
    if (!(await bcrypt.compare(input.currentPassword, user.passwordHash))) {
      throw new UnauthorizedException('Senha atual incorreta');
    }
    this.assertPassword(input.newPassword);
    await this.repo.updatePassword(userId, await bcrypt.hash(input.newPassword, BCRYPT_COST));
    // Trocar a senha encerra todas as sessões existentes.
    await this.repo.revokeAllForUser(userId, this.now());
  }

  private assertPassword(password: string): void {
    const errors = validatePassword(password);
    if (errors.length > 0) throw new UnprocessableEntityException(errors.join('; '));
  }

  private async issueSession(user: UserRecord): Promise<Session> {
    const payload: AccessPayload = { sub: user.id, role: user.role };
    const accessToken = await this.jwt.signAsync(payload);
    const { token, hash } = generateRefreshToken();
    const refreshExpiresAt = refreshExpiry(this.now(), this.options.refreshTtlDays);
    await this.repo.saveRefreshToken({ userId: user.id, tokenHash: hash, expiresAt: refreshExpiresAt });
    return { accessToken, refreshToken: token, refreshExpiresAt, user: toPublic(user) };
  }
}

function toPublic(user: UserRecord): PublicUser {
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}
