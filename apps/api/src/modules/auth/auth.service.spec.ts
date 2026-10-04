import { ConflictException, UnauthorizedException, UnprocessableEntityException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthRepository, RefreshRecord, UserRecord } from './auth.repository';
import { AuthService } from './auth.service';
import { hashToken } from './auth.rules';

class MemoryRepo extends AuthRepository {
  users: UserRecord[] = [];
  tokens: (RefreshRecord & { tokenHash: string })[] = [];
  private seq = 0;

  async findUserByEmail(email: string) {
    return this.users.find((u) => u.email === email) ?? null;
  }
  async findUserById(id: string) {
    return this.users.find((u) => u.id === id) ?? null;
  }
  async createUser(d: { name: string; email: string; passwordHash: string }) {
    const user: UserRecord = { id: `u${++this.seq}`, role: 'REQUESTER', active: true, ...d };
    this.users.push(user);
    return user;
  }
  async updatePassword(userId: string, passwordHash: string) {
    const u = this.users.find((x) => x.id === userId);
    if (u) u.passwordHash = passwordHash;
  }
  async saveRefreshToken(d: { userId: string; tokenHash: string; expiresAt: Date }) {
    this.tokens.push({ id: `t${++this.seq}`, revokedAt: null, ...d });
  }
  async findRefreshToken(tokenHash: string) {
    return this.tokens.find((t) => t.tokenHash === tokenHash) ?? null;
  }
  async revokeRefreshToken(id: string, at: Date) {
    const t = this.tokens.find((x) => x.id === id);
    if (!t || t.revokedAt) return false;
    t.revokedAt = at;
    return true;
  }
  async revokeAllForUser(userId: string, at: Date) {
    this.tokens.filter((t) => t.userId === userId && !t.revokedAt).forEach((t) => (t.revokedAt = at));
  }
}

const PASSWORD = 'senha-segura-123';

describe('AuthService', () => {
  let repo: MemoryRepo;
  let service: AuthService;
  let clock: Date;

  beforeEach(() => {
    repo = new MemoryRepo();
    clock = new Date('2026-01-01T12:00:00Z');
    const jwt = new JwtService({ secret: 'x'.repeat(32), signOptions: { expiresIn: '15m' } });
    service = new AuthService(repo, jwt, { refreshTtlDays: 7 }, () => clock);
  });

  it('cadastra como REQUESTER, normaliza e-mail e guarda só o hash do refresh token', async () => {
    const s = await service.register({ name: ' Ana ', email: ' Ana@Empresa.com ', password: PASSWORD });
    expect(s.user).toEqual({ id: 'u1', name: 'Ana', email: 'ana@empresa.com', role: 'REQUESTER' });
    expect(repo.users[0].passwordHash).not.toBe(PASSWORD);
    expect(repo.tokens[0].tokenHash).toBe(hashToken(s.refreshToken));
    expect(repo.tokens[0].tokenHash).not.toBe(s.refreshToken);
  });

  it('rejeita e-mail duplicado e senha curta', async () => {
    await service.register({ name: 'Ana', email: 'a@a.com', password: PASSWORD });
    await expect(service.register({ name: 'B', email: 'A@a.com', password: PASSWORD })).rejects.toBeInstanceOf(ConflictException);
    await expect(service.register({ name: 'C', email: 'c@c.com', password: 'curta' })).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('login com mesma mensagem para e-mail inexistente, senha errada e usuário inativo', async () => {
    await service.register({ name: 'Ana', email: 'a@a.com', password: PASSWORD });
    const messages = new Set<string>();
    const attempts = [
      () => service.login({ email: 'x@x.com', password: PASSWORD }),
      () => service.login({ email: 'a@a.com', password: 'errada-errada' }),
      () => {
        repo.users[0].active = false;
        return service.login({ email: 'a@a.com', password: PASSWORD });
      },
    ];
    for (const attempt of attempts) {
      await attempt().catch((e: UnauthorizedException) => messages.add(e.message));
    }
    expect(messages.size).toBe(1);
  });

  it('refresh rotaciona o token e revoga o anterior', async () => {
    const first = await service.register({ name: 'Ana', email: 'a@a.com', password: PASSWORD });
    const second = await service.refresh(first.refreshToken);
    expect(second.refreshToken).not.toBe(first.refreshToken);
    expect(repo.tokens[0].revokedAt).not.toBeNull();
    expect(repo.tokens[1].revokedAt).toBeNull();
  });

  it('reuso de refresh token revogado derruba todas as sessões', async () => {
    const first = await service.register({ name: 'Ana', email: 'a@a.com', password: PASSWORD });
    const second = await service.refresh(first.refreshToken);
    await expect(service.refresh(first.refreshToken)).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(service.refresh(second.refreshToken)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('refresh expirado ou ausente é recusado', async () => {
    const s = await service.register({ name: 'Ana', email: 'a@a.com', password: PASSWORD });
    await expect(service.refresh(undefined)).rejects.toBeInstanceOf(UnauthorizedException);
    clock = new Date('2026-01-09T12:00:00Z');
    await expect(service.refresh(s.refreshToken)).rejects.toThrow('Sessão expirada');
  });

  it('usuário desativado não renova a sessão (RF-08)', async () => {
    const s = await service.register({ name: 'Ana', email: 'a@a.com', password: PASSWORD });
    repo.users[0].active = false;
    await expect(service.refresh(s.refreshToken)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('logout revoga o token atual', async () => {
    const s = await service.register({ name: 'Ana', email: 'a@a.com', password: PASSWORD });
    await service.logout(s.refreshToken);
    expect(repo.tokens[0].revokedAt).not.toBeNull();
    await expect(service.logout(undefined)).resolves.toBeUndefined();
  });

  it('troca de senha exige a atual e encerra todas as sessões', async () => {
    const s = await service.register({ name: 'Ana', email: 'a@a.com', password: PASSWORD });
    await expect(
      service.changePassword('u1', { currentPassword: 'errada-errada', newPassword: 'outra-senha-123' }),
    ).rejects.toThrow('Senha atual incorreta');
    await service.changePassword('u1', { currentPassword: PASSWORD, newPassword: 'outra-senha-123' });
    await expect(service.refresh(s.refreshToken)).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(service.login({ email: 'a@a.com', password: 'outra-senha-123' })).resolves.toBeDefined();
  });
});
