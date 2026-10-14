import { AlertTriangle, Inbox, Loader2 } from 'lucide-react';
import { Button } from './form';

export function Loading({ label = 'Carregando...' }: { label?: string }) {
  return (
    <div role="status" className="flex items-center justify-center gap-2 py-16 text-[13px] text-ink-3">
      <Loader2 size={16} className="animate-spin" aria-hidden />
      {label}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 rounded-xl border border-bad/30 bg-bad/5 px-6 py-10 text-center">
      <AlertTriangle size={20} className="text-bad" aria-hidden />
      <p className="text-[13px] text-ink-2">{message}</p>
      {onRetry && (
        <Button size="sm" onClick={onRetry}>
          Tentar de novo
        </Button>
      )}
    </div>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
      <Inbox size={20} className="text-ink-3" aria-hidden />
      <p className="text-[13px] text-ink-2">{title}</p>
      {hint && <p className="text-xs text-ink-3">{hint}</p>}
    </div>
  );
}
