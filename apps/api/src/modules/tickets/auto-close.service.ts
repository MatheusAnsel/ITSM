import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { AutoCloseRepository } from './auto-close.repository';
import { autoCloseCutoff } from './ticket.rules';

const BATCH_SIZE = 100;

// RN-07: chamados resolvidos há 3 dias sem reabertura passam para CLOSED.
@Injectable()
export class AutoCloseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AutoCloseService.name);
  private timer?: NodeJS.Timeout;

  constructor(
    private readonly repo: AutoCloseRepository,
    private readonly intervalMinutes: number,
  ) {}

  onModuleInit(): void {
    if (this.intervalMinutes <= 0 || process.env.NODE_ENV === 'test') return;
    this.timer = setInterval(() => void this.runSafely(), this.intervalMinutes * 60_000);
    this.timer.unref();
    void this.runSafely();
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  async run(now: Date = new Date()): Promise<number> {
    const systemUserId = await this.repo.findSystemUserId();
    if (!systemUserId) {
      this.logger.warn(
        'Usuário de sistema não encontrado; rode o seed. Fechamento automático ignorado.',
      );
      return 0;
    }
    const cutoff = autoCloseCutoff(now);
    let closed = 0;
    // Em lotes, para não segurar transações longas se houver muitos chamados vencidos.
    for (;;) {
      const ids = await this.repo.findDueIds(cutoff, BATCH_SIZE);
      let progress = 0;
      for (const id of ids) {
        if (await this.repo.close(id, cutoff, systemUserId, now)) progress += 1;
      }
      closed += progress;
      if (ids.length < BATCH_SIZE || progress === 0) break;
    }
    return closed;
  }

  private async runSafely(): Promise<void> {
    try {
      const closed = await this.run();
      if (closed > 0)
        this.logger.log(`${closed} chamado(s) resolvido(s) fechado(s) automaticamente`);
    } catch (error) {
      this.logger.error(
        'Falha no fechamento automático',
        error instanceof Error ? error.stack : undefined,
      );
    }
  }
}
