import {
  CallHandler,
  ExecutionContext,
  HttpException,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { catchError, Observable, tap, throwError } from 'rxjs';
import { AUDIT_KEY, AuditOptions, AuditRequest } from './audit.decorator';
import { changedFields, clientIp } from './audit.rules';
import { AuditService } from './audit.service';

// Grava a trilha de auditoria das rotas marcadas com @Audit, depois que o handler responde.
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly audit: AuditService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const options = this.reflector.get<AuditOptions | undefined>(AUDIT_KEY, context.getHandler());
    if (!options) return next.handle();
    const req = context.switchToHttp().getRequest<AuditRequest>();

    return next.handle().pipe(
      tap((result) => {
        void this.audit.record({
          actorId: req.user?.id ?? options.actorId?.(req, result) ?? null,
          action: options.action,
          entity: options.entity,
          entityId: options.entityId?.(req, result) ?? null,
          metadata: this.metadata(req, options),
          ip: clientIp(req.ip),
        });
      }),
      catchError((error: unknown) => {
        if (options.failureAction) {
          void this.audit.record({
            actorId: req.user?.id ?? null,
            action: options.failureAction,
            entity: options.entity,
            entityId: options.entityId?.(req, undefined) ?? null,
            metadata: {
              ...this.metadata(req, options),
              status: error instanceof HttpException ? error.getStatus() : 500,
            },
            ip: clientIp(req.ip),
          });
        }
        return throwError(() => error);
      }),
    );
  }

  private metadata(req: AuditRequest, options: AuditOptions): Record<string, unknown> | null {
    const fields = changedFields(req.body);
    const meta = { ...(fields.length > 0 ? { fields } : {}), ...(options.extra?.(req) ?? {}) };
    return Object.keys(meta).length > 0 ? meta : null;
  }
}
