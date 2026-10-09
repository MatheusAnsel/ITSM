import { Module } from '@nestjs/common';
import { PrismaSlaRepository } from './sla.prisma.repository';
import { SlaController } from './sla.controller';
import { SlaRepository } from './sla.repository';
import { SlaService } from './sla.service';

@Module({
  controllers: [SlaController],
  providers: [{ provide: SlaRepository, useClass: PrismaSlaRepository }, SlaService],
})
export class SlaModule {}
