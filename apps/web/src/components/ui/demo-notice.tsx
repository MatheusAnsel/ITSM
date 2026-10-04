import { Info } from 'lucide-react';

export function DemoNotice() {
  return (
    <div className="mb-4 flex items-center gap-2 rounded-lg border border-line bg-panel/60 px-3 py-2 text-xs text-ink-2">
      <Info size={14} className="shrink-0 text-info" />
      <span>Dados de demonstração. Esta tela será ligada à API quando os endpoints de chamados e ativos existirem.</span>
    </div>
  );
}
