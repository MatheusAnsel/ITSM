import { Controller, Get, Query } from '@nestjs/common';
import { Roles } from '../../common/decorators/auth.decorators';
import { AuditService } from './audit.service';
import { ListAuditQuery } from './dto/audit.dto';

@Controller('audit')
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Roles('ADMIN')
  @Get()
  list(@Query() query: ListAuditQuery) {
    return this.audit.list(query);
  }
}
