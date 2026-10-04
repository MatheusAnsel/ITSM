import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import type { RoleName } from '../../common/roles';
import { BCRYPT_COST, normalizeEmail, validatePassword } from '../auth/auth.rules';
import { pageOffset, validateAdminSafety } from './users.rules';
import { UsersRepository, UserView } from './users.repository';

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

@Injectable()
export class UsersService {
  constructor(
    private readonly repo: UsersRepository,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async list(query: { search?: string; role?: RoleName; page: number; pageSize: number }): Promise<Page<UserView>> {
    const { items, total } = await this.repo.list({
      search: query.search || undefined,
      role: query.role,
      skip: pageOffset(query.page, query.pageSize),
      take: query.pageSize,
    });
    return { items, total, page: query.page, pageSize: query.pageSize };
  }

  agents() {
    return this.repo.listActiveStaff();
  }

  async get(id: string): Promise<UserView> {
    const user = await this.repo.findById(id);
    if (!user) throw new NotFoundException('Usuário não encontrado');
    return user;
  }

  async create(input: { name: string; email: string; password: string; role: RoleName }): Promise<UserView> {
    const errors = validatePassword(input.password);
    if (errors.length > 0) throw new UnprocessableEntityException(errors.join('; '));
    const email = normalizeEmail(input.email);
    if (await this.repo.findByEmail(email)) throw new ConflictException('E-mail já cadastrado');
    const passwordHash = await bcrypt.hash(input.password, BCRYPT_COST);
    return this.repo.create({ name: input.name.trim(), email, passwordHash, role: input.role });
  }

  async update(
    actorId: string,
    id: string,
    change: { name?: string; role?: RoleName; active?: boolean },
  ): Promise<UserView> {
    if (change.name === undefined && change.role === undefined && change.active === undefined) {
      throw new BadRequestException('Informe ao menos um campo para alterar');
    }
    const found = await this.get(id);
    const target = { ...found }; // cópia: a comparação final usa o estado anterior
    const violation = validateAdminSafety({
      actorId,
      target,
      change,
      activeAdminCount: await this.repo.countActiveAdmins(),
    });
    if (violation) throw new UnprocessableEntityException(violation);

    const updated = await this.repo.update(id, {
      ...(change.name !== undefined ? { name: change.name.trim() } : {}),
      ...(change.role !== undefined ? { role: change.role } : {}),
      ...(change.active !== undefined ? { active: change.active } : {}),
    });
    // Desativar ou mudar de perfil encerra as sessões (RF-08); o access token
    // restante expira no TTL curto.
    if (change.active === false || (change.role !== undefined && change.role !== target.role)) {
      await this.repo.revokeSessions(id, this.now());
    }
    return updated;
  }
}
