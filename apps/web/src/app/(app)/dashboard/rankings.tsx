import { ErrorState } from '@/components/ui/states';
import type { AsyncState } from '@/hooks/use-async';
import { formatDuration } from '@/lib/format';
import type { AgentStat, CategoryStat } from '@/lib/types';
import { Card } from './charts';

export function Rankings({ categories, agents }: { categories: AsyncState<CategoryStat[]>; agents: AsyncState<AgentStat[]> }) {
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <Card title="Por categoria">
        {categories.error ? (
          <ErrorState message={categories.error} onRetry={categories.reload} />
        ) : (
          <table className="w-full text-[13px]">
            <thead>
              <tr className="text-left text-xs text-ink-3">
                <th className="pb-2 font-medium">Categoria</th>
                <th className="pb-2 text-right font-medium">Total</th>
                <th className="pb-2 text-right font-medium">Em aberto</th>
              </tr>
            </thead>
            <tbody>
              {categories.data?.map((c) => (
                <tr key={c.categoryId} className="border-t border-line/70">
                  <td className="py-2 text-ink">{c.name}</td>
                  <td className="py-2 text-right tabular-nums text-ink-2">{c.total}</td>
                  <td className="py-2 text-right tabular-nums text-ink-2">{c.open}</td>
                </tr>
              ))}
              {categories.data?.length === 0 && (
                <tr><td colSpan={3} className="py-6 text-center text-ink-3">Sem chamados no período</td></tr>
              )}
            </tbody>
          </table>
        )}
      </Card>
      <Card title="Por atendente">
        {agents.error ? (
          <ErrorState message={agents.error} onRetry={agents.reload} />
        ) : (
          <table className="w-full text-[13px]">
            <thead>
              <tr className="text-left text-xs text-ink-3">
                <th className="pb-2 font-medium">Atendente</th>
                <th className="pb-2 text-right font-medium">Em aberto</th>
                <th className="pb-2 text-right font-medium">Resolvidos</th>
                <th className="pb-2 text-right font-medium">Tempo médio</th>
              </tr>
            </thead>
            <tbody>
              {agents.data?.map((a) => (
                <tr key={a.agentId} className="border-t border-line/70">
                  <td className="py-2 text-ink">{a.name}</td>
                  <td className="py-2 text-right tabular-nums text-ink-2">{a.open}</td>
                  <td className="py-2 text-right tabular-nums text-ink-2">{a.resolved}</td>
                  <td className="py-2 text-right tabular-nums text-ink-2">{formatDuration(a.avgResolutionMinutes)}</td>
                </tr>
              ))}
              {agents.data?.length === 0 && (
                <tr><td colSpan={4} className="py-6 text-center text-ink-3">Sem atendimentos no período</td></tr>
              )}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
