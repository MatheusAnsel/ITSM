export abstract class AutoCloseRepository {
  abstract findSystemUserId(): Promise<string | null>;
  abstract findDueIds(cutoff: Date, limit: number): Promise<string[]>;
  // Fecha o chamado e grava o histórico na mesma transação. Devolve false se ele
  // deixou de estar resolvido (reaberto ou fechado por outra instância) desde a leitura.
  abstract close(id: string, cutoff: Date, systemUserId: string, now: Date): Promise<boolean>;
}
