import { cn } from '@/lib/cn';

export interface Column<T> {
  key: string;
  header: string;
  align?: 'left' | 'right';
  width?: string;
  render: (row: T) => React.ReactNode;
}

// Tabela da referência: painel com borda, cabeçalho discreto e linhas separadas por filete.
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  empty = 'Nenhum resultado',
}: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string | number;
  empty?: string;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-panel/60">
      <div className="scroll-thin overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-left text-[13px]">
          <thead>
            <tr className="border-b border-line text-ink-2">
              {columns.map((c) => (
                <th
                  key={c.key}
                  scope="col"
                  style={{ width: c.width }}
                  className={cn('px-4 py-3 text-xs font-medium', c.align === 'right' && 'text-right')}
                >
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-10 text-center text-ink-3">
                  {empty}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={rowKey(row)} className="border-b border-line/70 last:border-0 transition-colors hover:bg-white/[0.03]">
                  {columns.map((c) => (
                    <td key={c.key} className={cn('px-4 py-3.5 align-middle', c.align === 'right' && 'text-right')}>
                      {c.render(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
