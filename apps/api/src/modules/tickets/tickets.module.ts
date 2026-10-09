import { Module } from '@nestjs/common';
import { PrismaTicketsRepository } from './tickets.prisma.repository';
import { AutoCloseService } from './auto-close.service';
import { AutoCloseRepository } from './auto-close.repository';
import { PrismaAutoCloseRepository } from './auto-close.prisma.repository';
import { validateEnv } from '../../config/env';
import { TicketsController } from './tickets.controller';
import { TicketsRepository } from './tickets.repository';
import { TicketsService } from './tickets.service';

@Module({
  controllers: [TicketsController],
  providers: [
    { provide: TicketsRepository, useClass: PrismaTicketsRepository },
    { provide: AutoCloseRepository, useClass: PrismaAutoCloseRepository },
    {
      provide: AutoCloseService,
      useFactory: (repo: AutoCloseRepository) => new AutoCloseService(repo, validateEnv().AUTO_CLOSE_INTERVAL_MINUTES),
      inject: [AutoCloseRepository],
    },
    {
      provide: TicketsService,
      useFactory: (repo: TicketsRepository) => new TicketsService(repo),
      inject: [TicketsRepository],
    },
  ],
  exports: [TicketsService],
})
export class TicketsModule {}
