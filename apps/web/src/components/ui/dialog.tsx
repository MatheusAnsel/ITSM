'use client';

import { X } from 'lucide-react';
import { useEffect, useId, useRef } from 'react';
import { Button } from './form';

// Usa <dialog> nativo: foco preso, Esc fecha e leitores de tela anunciam como modal.
export function Dialog({
  open,
  title,
  onClose,
  children,
  wide,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      className={`m-auto w-[calc(100%-2rem)] ${wide ? 'max-w-[560px]' : 'max-w-[440px]'} rounded-2xl border border-line-strong bg-window p-0 text-ink backdrop:bg-black/60 backdrop:backdrop-blur-sm`}
    >
      {open && (
        <div className="p-5">
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 id={titleId} className="text-[16px] font-semibold tracking-tight">
              {title}
            </h2>
            <button
              type="button"
              aria-label="Fechar"
              onClick={onClose}
              className="grid h-7 w-7 place-items-center rounded-lg text-ink-2 hover:bg-white/[0.06] hover:text-ink"
            >
              <X size={15} />
            </button>
          </div>
          {children}
        </div>
      )}
    </dialog>
  );
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  danger,
  busy,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Dialog open={open} title={title} onClose={onClose}>
      <p className="mb-5 text-[13px] leading-relaxed text-ink-2">{message}</p>
      <div className="flex justify-end gap-2">
        <Button onClick={onClose} disabled={busy}>
          Voltar
        </Button>
        <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm} disabled={busy}>
          {busy ? 'Aguarde...' : confirmLabel}
        </Button>
      </div>
    </Dialog>
  );
}
