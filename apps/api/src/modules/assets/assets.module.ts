import { Module } from '@nestjs/common';
import { AssetsController } from './assets.controller';
import { AssetsRepository } from './assets.repository';
import { PrismaAssetsRepository } from './assets.prisma.repository';
import { AssetsService } from './assets.service';

@Module({
  controllers: [AssetsController],
  providers: [{ provide: AssetsRepository, useClass: PrismaAssetsRepository }, AssetsService],
  exports: [AssetsService],
})
export class AssetsModule {}
