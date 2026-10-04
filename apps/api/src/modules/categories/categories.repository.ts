import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface CategoryView {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
}

export abstract class CategoriesRepository {
  abstract list(onlyActive: boolean): Promise<CategoryView[]>;
  abstract findById(id: string): Promise<CategoryView | null>;
  abstract findByName(name: string): Promise<CategoryView | null>;
  abstract create(data: { name: string; description?: string }): Promise<CategoryView>;
  abstract update(id: string, data: { name?: string; description?: string; active?: boolean }): Promise<CategoryView>;
}

const SELECT = { id: true, name: true, description: true, active: true } as const;

@Injectable()
export class PrismaCategoriesRepository extends CategoriesRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  list(onlyActive: boolean): Promise<CategoryView[]> {
    return this.prisma.category.findMany({
      where: onlyActive ? { active: true } : {},
      select: SELECT,
      orderBy: { name: 'asc' },
    });
  }

  findById(id: string): Promise<CategoryView | null> {
    return this.prisma.category.findUnique({ where: { id }, select: SELECT });
  }

  findByName(name: string): Promise<CategoryView | null> {
    return this.prisma.category.findFirst({ where: { name: { equals: name, mode: 'insensitive' } }, select: SELECT });
  }

  create(data: { name: string; description?: string }): Promise<CategoryView> {
    return this.prisma.category.create({ data, select: SELECT });
  }

  update(id: string, data: { name?: string; description?: string; active?: boolean }): Promise<CategoryView> {
    return this.prisma.category.update({ where: { id }, data, select: SELECT });
  }
}
