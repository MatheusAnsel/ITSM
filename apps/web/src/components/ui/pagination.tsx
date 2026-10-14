import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './form';

export function Pagination({
  page,
  pageSize,
  total,
  onChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  onChange: (page: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (total === 0) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  return (
    <div className="mt-3 flex items-center justify-between gap-3 text-xs text-ink-3">
      <span>
        {from}–{to} de {total}
      </span>
      <div className="flex items-center gap-1.5">
        <Button size="sm" aria-label="Página anterior" disabled={page <= 1} onClick={() => onChange(page - 1)}>
          <ChevronLeft size={14} />
        </Button>
        <span className="px-1 tabular-nums">
          {page} / {pages}
        </span>
        <Button size="sm" aria-label="Próxima página" disabled={page >= pages} onClick={() => onChange(page + 1)}>
          <ChevronRight size={14} />
        </Button>
      </div>
    </div>
  );
}
