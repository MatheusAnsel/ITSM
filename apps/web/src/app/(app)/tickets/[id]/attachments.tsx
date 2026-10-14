'use client';

import { Download, FileText, ImageIcon, Paperclip } from 'lucide-react';
import { useRef, useState } from 'react';
import { Button, FormError } from '@/components/ui/form';
import { useAsync } from '@/hooks/use-async';
import { ApiError, downloadAttachment, listAttachments, uploadAttachment } from '@/lib/api';
import { formatBytes, formatDateTime } from '@/lib/format';

const ACCEPT = '.png,.jpg,.jpeg,.pdf,.txt,.log';
const MAX_MB = 5;
const MAX_FILES = 10;

export function Attachments({ ticketId, canUpload }: { ticketId: string; canUpload: boolean }) {
  const list = useAsync(() => listAttachments(ticketId), [ticketId]);
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const count = list.data?.length ?? 0;

  async function onPick(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setError(null);
    if (file.size > MAX_MB * 1024 * 1024) {
      setError(`O arquivo excede o limite de ${MAX_MB} MB`);
      return;
    }
    setBusy(true);
    try {
      await uploadAttachment(ticketId, file);
      list.reload();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Erro inesperado');
    } finally {
      setBusy(false);
    }
  }

  async function download(index: number) {
    const item = list.data?.[index];
    if (!item) return;
    setError(null);
    try {
      await downloadAttachment(ticketId, item);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Erro inesperado');
    }
  }

  return (
    <div>
      {list.error && <p className="text-[13px] text-bad">{list.error}</p>}
      {list.data && list.data.length === 0 && <p className="text-[13px] text-ink-3">Nenhum anexo.</p>}
      <ul className="space-y-1.5">
        {list.data?.map((a, i) => (
          <li key={a.id} className="flex items-center gap-3 rounded-lg border border-line bg-panel/60 px-3 py-2">
            {a.mimeType.startsWith('image/') ? (
              <ImageIcon size={15} className="shrink-0 text-ink-3" aria-hidden />
            ) : (
              <FileText size={15} className="shrink-0 text-ink-3" aria-hidden />
            )}
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] text-ink">{a.filename}</div>
              <div className="text-xs text-ink-3">
                {formatBytes(a.size)} · {a.uploader.name} · {formatDateTime(a.createdAt)}
              </div>
            </div>
            <Button size="sm" variant="ghost" aria-label={`Baixar ${a.filename}`} onClick={() => void download(i)}>
              <Download size={14} />
            </Button>
          </li>
        ))}
      </ul>
      <div className="mt-3 space-y-2">
        <FormError message={error} />
        {canUpload && (
          <>
            <input ref={input} type="file" accept={ACCEPT} onChange={onPick} className="sr-only" aria-label="Escolher arquivo" tabIndex={-1} />
            <Button size="sm" disabled={busy || count >= MAX_FILES} onClick={() => input.current?.click()}>
              <Paperclip size={13} /> {busy ? 'Enviando...' : 'Anexar arquivo'}
            </Button>
            <p className="text-xs text-ink-3">PNG, JPEG, PDF, TXT ou LOG · até {MAX_MB} MB · máximo de {MAX_FILES} arquivos</p>
          </>
        )}
      </div>
    </div>
  );
}
