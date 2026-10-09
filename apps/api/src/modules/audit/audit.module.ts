import { Global, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AuditController } from './audit.controller';
import { AuditInterceptor } from './audit.interceptor';
import { PrismaAuditRepository } from './audit.prisma.repository';
import { AuditRepository } from './audit.repository';
import { AuditService } from './audit.service';

@Global()
@Module({
  controllers: [AuditController],
  providers: [
    { provide: AuditRepository, useClass: PrismaAuditRepository },
    AuditService,
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
  exports: [AuditService],
})
export class AuditModule {}
