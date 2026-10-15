'use client';

import { PageHeader } from '@/components/ui/page-header';
import { ErrorState, Loading } from '@/components/ui/states';
import { useAsync } from '@/hooks/use-async';
import { dashboardByAgent, dashboardByCategory, dashboardSummary, dashboardVolume } from '@/lib/api';
import { formatDate, formatDuration } from '@/lib/format';
import { Charts } from './charts';
import { Rankings } from './rankings';

function Kpi({ label, value, hint, tone }: { label: string; value: string; hint: string; tone: string }) {
  return (
    <div className="rounded-lg border border-line bg-panel p-4">
      <div className="text-xs text-ink-2">{label}</div>
      <div className={`mt-2 text-[28px] font-semibold leading-none tracking-tight ${tone}`}>{value}</div>
      <div className="mt-2 text-xs text-ink-3">{hint}</div>
    </div>
  );
}

const pct = (v: number | null) => (v === null ? '—' : `${v}%`);

export function DashboardView() {
  const summary = useAsync(dashboardSummary, []);
  const volume = useAsync(dashboardVolume, []);
  const categories = useAsync(dashboardByCategory, []);
  const agents = useAsync(dashboardByAgent, []);

  if (summary.error) return <ErrorState message={summary.error} onRetry={summary.reload} />;
  if (!summary.data) return <Loading />;
  const s = summary.data;
  const open = s.byStatus.OPEN + s.byStatus.IN_PROGRESS + s.byStatus.WAITING_USER;

  return (
    <>
      <PageHeader
        title="Painel gerencial"
        subtitle={`Chamados criados de ${formatDate(s.period.from)} a ${formatDate(s.period.to)}`}
      />
      <section aria-label="Indicadores" className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Em aberto" value={String(open)} hint={`${s.byStatus.OPEN} novos · ${s.byStatus.WAITING_USER} aguardando usuário`} tone="text-info" />
        <Kpi label="Em atendimento" value={String(s.byStatus.IN_PROGRESS)} hint={`${s.byStatus.RESOLVED} resolvidos no período`} tone="text-ink" />
        <Kpi label="SLA de resolução" value={pct(s.sla.resolutionCompliancePercent)} hint={`${s.sla.resolvedInPeriod} resolvidos · resposta ${pct(s.sla.responseCompliancePercent)}`} tone="text-ok" />
        <Kpi label="Violados agora" value={String(s.sla.openBreached)} hint="chamados em aberto fora do prazo" tone={s.sla.openBreached > 0 ? 'text-bad' : 'text-ink'} />
      </section>
      <p className="mb-4 text-xs text-ink-3">
        Tempo médio da primeira resposta: {formatDuration(s.averages.firstResponseMinutes)} · de resolução: {formatDuration(s.averages.resolutionMinutes)}
      </p>

      {volume.error ? <ErrorState message={volume.error} onRetry={volume.reload} /> : <Charts volume={volume.data ?? []} byPriority={s.byPriority} loading={!volume.data} />}
      <Rankings categories={categories} agents={agents} />
    </>
  );
}
