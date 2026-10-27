'use client';

import { AlertTriangle, Inbox, Loader2 } from 'lucide-react';
import { Button } from './form';
import { useServidorIniciando, MENSAGEM_SERVIDOR, DETALHE_SERVIDOR } from '@/lib/servidor';

export function Loading({ label = 'Carregando...' }: { label?: string }) {
  const iniciando = useServidorIniciando();
  return (
    <div role="status" aria-live="polite" className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center text-[13px] text-ink-3">
      <span className="flex items-center gap-2">
        <Loader2 size={16} className="animate-spin" aria-hidden />
        {iniciando ? <strong className="font-semibold text-ink">{MENSAGEM_SERVIDOR}</strong> : label}
      </span>
      {iniciando && <p className="max-w-sm">{DETALHE_SERVIDOR}</p>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 rounded-lg border border-bad/30 bg-bad/5 px-6 py-10 text-center">
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
