import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { PrismaDashboardRepository } from './dashboard.prisma.repository';
import { DashboardRepository } from './dashboard.repository';
import { DashboardService } from './dashboard.service';

@Module({
  controllers: [DashboardController],
  providers: [
    { provide: DashboardRepository, useClass: PrismaDashboardRepository },
    {
      provide: DashboardService,
      useFactory: (repo: DashboardRepository) => new DashboardService(repo),
      inject: [DashboardRepository],
    },
  ],
})
export class DashboardModule {}
