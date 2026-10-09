import { BadRequestException, Body, Controller, Get, Param, Put } from '@nestjs/common';
import { Roles } from '../../common/decorators/auth.decorators';
import type { Priority } from '../tickets/ticket.rules';
import { UpdateSlaPolicyDto } from './dto/sla.dto';
import { PRIORITY_ORDER, SlaService } from './sla.service';

@Controller('sla-policies')
export class SlaController {
  constructor(private readonly sla: SlaService) {}

  @Roles('AGENT', 'MANAGER', 'ADMIN')
  @Get()
  list() {
    return this.sla.list();
  }

  @Roles('ADMIN')
  @Put(':priority')
  update(@Param('priority') priority: string, @Body() dto: UpdateSlaPolicyDto) {
    if (!PRIORITY_ORDER.includes(priority as Priority))
      throw new BadRequestException('Prioridade inválida');
    return this.sla.update(priority as Priority, dto);
  }
}
