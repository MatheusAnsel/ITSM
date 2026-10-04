import type { LucideIcon } from 'lucide-react';

export interface HeaderAction {
  label: string;
  icon: LucideIcon;
}

// Título da página com a fileira de botões de ação quadrados à direita.
export function PageHeader({ title, subtitle, actions = [] }: { title: string; subtitle?: string; actions?: HeaderAction[] }) {
  return (
    <div className="mb-5 flex items-start justify-between gap-4">
      <div>
        <h1 className="text-[22px] font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-[13px] text-ink-2">{subtitle}</p>}
      </div>
      <div className="flex gap-1.5">
        {actions.map(({ label, icon: Icon }) => (
          <button
            key={label}
            type="button"
            aria-label={label}
            title={label}
            className="grid h-8 w-8 place-items-center rounded-lg border border-line bg-panel text-ink-2 transition-colors hover:border-line-strong hover:text-ink"
          >
            <Icon size={15} />
          </button>
        ))}
      </div>
    </div>
  );
}
