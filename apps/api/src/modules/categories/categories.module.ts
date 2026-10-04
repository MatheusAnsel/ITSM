import { Module } from '@nestjs/common';
import { CategoriesController } from './categories.controller';
import { CategoriesRepository, PrismaCategoriesRepository } from './categories.repository';
import { CategoriesService } from './categories.service';

@Module({
  controllers: [CategoriesController],
  providers: [{ provide: CategoriesRepository, useClass: PrismaCategoriesRepository }, CategoriesService],
  exports: [CategoriesService],
})
export class CategoriesModule {}
