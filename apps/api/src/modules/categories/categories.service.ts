import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { CategoriesRepository, CategoryView } from './categories.repository';

@Injectable()
export class CategoriesService {
  constructor(private readonly repo: CategoriesRepository) {}

  // Usuários comuns só veem categorias ativas; o administrador vê todas (RF-29).
  list(includeInactive: boolean): Promise<CategoryView[]> {
    return this.repo.list(!includeInactive);
  }

  async create(input: { name: string; description?: string }): Promise<CategoryView> {
    if (await this.repo.findByName(input.name)) throw new ConflictException('Já existe uma categoria com esse nome');
    return this.repo.create(input);
  }

  async update(id: string, change: { name?: string; description?: string; active?: boolean }): Promise<CategoryView> {
    if (Object.values(change).every((v) => v === undefined)) {
      throw new BadRequestException('Informe ao menos um campo para alterar');
    }
    const current = await this.repo.findById(id);
    if (!current) throw new NotFoundException('Categoria não encontrada');
    if (change.name !== undefined) {
      const clash = await this.repo.findByName(change.name);
      if (clash && clash.id !== id) throw new ConflictException('Já existe uma categoria com esse nome');
    }
    return this.repo.update(id, change);
  }
}
