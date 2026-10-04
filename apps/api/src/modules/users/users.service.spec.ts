import { BadRequestException, ConflictException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import type { RoleName } from '../../common/roles';
import { UserFilter, UsersRepository, UserView } from './users.repository';
import { UsersService } from './users.service';
import { validateAdminSafety } from './users.rules';

class MemoryUsers extends UsersRepository {
  users: (UserView & { passwordHash?: string })[] = [];
  revoked: string[] = [];
  lastFilter?: UserFilter;
  private seq = 0;

  seed(role: RoleName, active = true): UserView {
    const u: UserView = { id: `u${++this.seq}`, name: `N${this.seq}`, email: `e${this.seq}@x.com`, role, active, createdAt: new Date() };
    this.users.push(u);
    return u;
  }
  async list(filter: UserFilter) {
    this.lastFilter = filter;
    return { items: this.users.slice(filter.skip, filter.skip + filter.take), total: this.users.length };
  }
  async listActiveStaff() {
    return this.users.filter((u) => u.active && u.role !== 'REQUESTER');
  }
  async findById(id: string) {
    return this.users.find((u) => u.id === id) ?? null;
  }
  async findByEmail(email: string) {
    return this.users.find((u) => u.email === email) ?? null;
  }
  async create(d: { name: string; email: string; passwordHash: string; role: RoleName }) {
    const u = this.seed(d.role);
    u.name = d.name;
    u.email = d.email;
    return u;
  }
  async update(id: string, d: { name?: string; role?: RoleName; active?: boolean }) {
    const u = this.users.find((x) => x.id === id)!;
    Object.assign(u, d);
    return u;
  }
  async countActiveAdmins() {
    return this.users.filter((u) => u.role === 'ADMIN' && u.active).length;
  }
  async revokeSessions(userId: string) {
    this.revoked.push(userId);
  }
}

describe('UsersService', () => {
  let repo: MemoryUsers;
  let service: UsersService;
  let admin: UserView;

  beforeEach(() => {
    repo = new MemoryUsers();
    service = new UsersService(repo);
    admin = repo.seed('ADMIN');
  });

  it('cria usuário com e-mail normalizado e rejeita duplicado e senha fraca', async () => {
    const created = await service.create({ name: ' Bia ', email: ' BIA@X.com ', password: 'senha-segura-123', role: 'AGENT' });
    expect(created).toMatchObject({ name: 'Bia', email: 'bia@x.com', role: 'AGENT' });
    await expect(service.create({ name: 'Bia', email: 'bia@x.com', password: 'senha-segura-123', role: 'AGENT' })).rejects.toBeInstanceOf(ConflictException);
    await expect(service.create({ name: 'Cid', email: 'c@x.com', password: 'curta', role: 'AGENT' })).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('pagina a listagem', async () => {
    for (let i = 0; i < 5; i++) repo.seed('REQUESTER');
    const page = await service.list({ page: 2, pageSize: 2 });
    expect(repo.lastFilter).toMatchObject({ skip: 2, take: 2 });
    expect(page).toMatchObject({ total: 6, page: 2, pageSize: 2 });
    expect(page.items).toHaveLength(2);
  });

  it('retorna 404 para usuário inexistente e 400 para alteração vazia', async () => {
    await expect(service.get('nope')).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.update(admin.id, admin.id, {})).rejects.toBeInstanceOf(BadRequestException);
  });

  it('desativar ou trocar o perfil de outro usuário revoga as sessões dele', async () => {
    const agent = repo.seed('AGENT');
    await service.update(admin.id, agent.id, { active: false });
    await service.update(admin.id, agent.id, { role: 'MANAGER' });
    expect(repo.revoked).toEqual([agent.id, agent.id]);
  });

  it('alterar só o nome não revoga sessões', async () => {
    const agent = repo.seed('AGENT');
    await service.update(admin.id, agent.id, { name: 'Novo' });
    expect(repo.revoked).toEqual([]);
  });

  it('impede o admin de alterar a si mesmo', async () => {
    repo.seed('ADMIN');
    await expect(service.update(admin.id, admin.id, { active: false })).rejects.toBeInstanceOf(UnprocessableEntityException);
    await expect(service.update(admin.id, admin.id, { role: 'AGENT' })).rejects.toBeInstanceOf(UnprocessableEntityException);
    await expect(service.update(admin.id, admin.id, { name: 'Outro nome' })).resolves.toBeDefined();
  });

  it('impede remover o último administrador ativo', async () => {
    // Só `admin` está ativo; outro ator tenta rebaixá-lo.
    await expect(service.update('outro-ator', admin.id, { role: 'AGENT' })).rejects.toThrow('ao menos um administrador');
    await expect(service.update('outro-ator', admin.id, { active: false })).rejects.toThrow('ao menos um administrador');
    const second = repo.seed('ADMIN');
    await expect(service.update('outro-ator', second.id, { active: false })).resolves.toBeDefined();
  });
});

describe('validateAdminSafety', () => {
  const target = { id: 't', role: 'ADMIN' as RoleName, active: true };
  it('permite quando há outro admin ativo', () => {
    expect(validateAdminSafety({ actorId: 'a', target, change: { active: false }, activeAdminCount: 2 })).toBeNull();
  });
  it('não restringe alterações em não-admins', () => {
    expect(validateAdminSafety({ actorId: 'a', target: { ...target, role: 'AGENT' }, change: { active: false }, activeAdminCount: 1 })).toBeNull();
  });
});
