import { Module } from '@nestjs/common';
import { PrismaTicketsRepository } from './tickets.prisma.repository';
import { TicketsController } from './tickets.controller';
import { TicketsRepository } from './tickets.repository';
import { TicketsService } from './tickets.service';

@Module({
  controllers: [TicketsController],
  providers: [
    { provide: TicketsRepository, useClass: PrismaTicketsRepository },
    {
      provide: TicketsService,
      useFactory: (repo: TicketsRepository) => new TicketsService(repo),
      inject: [TicketsRepository],
    },
  ],
  exports: [TicketsService],
})
export class TicketsModule {}
