'use client';

import { Lock } from 'lucide-react';
import { useState } from 'react';
import { Button, FormError, Textarea } from '@/components/ui/form';
import { addComment, ApiError } from '@/lib/api';
import { formatDateTime, initials } from '@/lib/format';
import type { TicketComment } from '@/lib/types';

export function Comments({
  ticketId,
  items,
  staff,
  canComment,
  onAdded,
}: {
  ticketId: string;
  items: TicketComment[];
  staff: boolean;
  canComment: boolean;
  onAdded: () => void;
}) {
  const [body, setBody] = useState('');
  const [internal, setInternal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await addComment(ticketId, body.trim(), staff && internal);
      setBody('');
      setInternal(false);
      onAdded();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Erro inesperado');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      {items.length === 0 ? (
        <p className="py-4 text-[13px] text-ink-3">Nenhum comentário ainda.</p>
      ) : (
        <ul className="space-y-3">
          {items.map((c) => (
            <li
              key={c.id}
              className={`rounded-lg border p-3.5 ${c.internal ? 'border-warn/30 bg-warn/[0.04]' : 'border-line bg-panel'}`}
            >
              <div className="mb-1.5 flex items-center gap-2.5">
                <span className="grid h-6 w-6 place-items-center rounded-full bg-ink/[0.08] text-[10px] font-semibold text-ink-2" aria-hidden>
                  {initials(c.author.name)}
                </span>
                <span className="text-[13px] font-medium">{c.author.name}</span>
                {c.internal && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-warn">
                    <Lock size={11} /> Interno
                  </span>
                )}
                <time dateTime={c.createdAt} className="ml-auto text-xs text-ink-3">
                  {formatDateTime(c.createdAt)}
                </time>
              </div>
              <p className="whitespace-pre-wrap break-words text-[13px] leading-relaxed text-ink-2">{c.body}</p>
            </li>
          ))}
        </ul>
      )}

      {canComment ? (
        <form onSubmit={submit} className="mt-4 space-y-2.5">
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={internal ? 'Nota interna (só a equipe vê)' : 'Escreva um comentário'}
            aria-label="Novo comentário"
            maxLength={5000}
            rows={3}
          />
          <FormError message={error} />
          <div className="flex items-center justify-between gap-3">
            {staff ? (
              <label className="flex items-center gap-2 text-[13px] text-ink-2">
                <input type="checkbox" checked={internal} onChange={(e) => setInternal(e.target.checked)} />
                Comentário interno
              </label>
            ) : (
              <span />
            )}
            <Button type="submit" variant="primary" disabled={busy || body.trim().length === 0}>
              {busy ? 'Enviando...' : 'Comentar'}
            </Button>
          </div>
        </form>
      ) : (
        <p className="mt-4 text-xs text-ink-3">Este chamado está encerrado e não aceita novos comentários.</p>
      )}
    </div>
  );
}
