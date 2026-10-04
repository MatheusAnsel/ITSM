import { Download, Maximize2, Share2 } from 'lucide-react';
import type { Metadata } from 'next';
import { DemoNotice } from '@/components/ui/demo-notice';
import { PageHeader } from '@/components/ui/page-header';
import { Charts } from './charts';

export const metadata: Metadata = { title: 'Painel' };

const KPIS = [
  { label: 'Chamados abertos', value: '38', hint: '+6 desde ontem', tone: 'text-info' },
  { label: 'Em atendimento', value: '21', hint: '4 aguardando usuário', tone: 'text-violet' },
  { label: 'SLA cumprido', value: '92%', hint: 'resolvidos nos últimos 30 dias', tone: 'text-ok' },
  { label: 'SLA violado', value: '5', hint: '2 críticos', tone: 'text-bad' },
];

export default function DashboardPage() {
  return (
    <>
      <PageHeader
        title="Painel gerencial"
        subtitle="Visão geral do atendimento"
        actions={[
          { label: 'Compartilhar', icon: Share2 },
          { label: 'Exportar', icon: Download },
          { label: 'Tela cheia', icon: Maximize2 },
        ]}
      />
      <DemoNotice />
      <section aria-label="Indicadores" className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {KPIS.map((k) => (
          <div key={k.label} className="rounded-xl border border-line bg-panel/60 p-4">
            <div className="text-xs text-ink-2">{k.label}</div>
            <div className={`mt-2 text-[28px] font-semibold leading-none tracking-tight ${k.tone}`}>{k.value}</div>
            <div className="mt-2 text-xs text-ink-3">{k.hint}</div>
          </div>
        ))}
      </section>
      <Charts />
    </>
  );
}
