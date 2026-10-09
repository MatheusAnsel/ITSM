import { Injectable, Logger } from '@nestjs/common';
import { AuditEntry, AuditFilter, AuditRepository, AuditView } from './audit.repository';

export interface AuditPage {
  items: AuditView[];
  total: number;
  page: number;
  pageSize: number;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly repo: AuditRepository) {}

  // A trilha é auxiliar: falha ao gravar é registrada no log da aplicação e nunca derruba a requisição.
  async record(entry: AuditEntry): Promise<void> {
    try {
      await this.repo.create(entry);
    } catch (error) {
      this.logger.error(
        `Falha ao gravar auditoria (${entry.action} ${entry.entity})`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  async list(
    filter: Omit<AuditFilter, 'skip' | 'take'> & { page: number; pageSize: number },
  ): Promise<AuditPage> {
    const { page, pageSize, ...rest } = filter;
    const { items, total } = await this.repo.list({
      ...rest,
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    return { items, total, page, pageSize };
  }
}
