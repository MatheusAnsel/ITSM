import { Bell, CircleHelp, Plus, Search, Settings, Waypoints } from 'lucide-react';
import Link from 'next/link';

function IconButton({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      className="grid h-8 w-8 place-items-center rounded-lg text-ink-2 transition-colors hover:bg-white/[0.06] hover:text-ink"
    >
      {children}
    </button>
  );
}

export function Topbar() {
  return (
    <header className="flex h-14 items-center gap-4 border-b border-line px-4">
      <Link href="/dashboard" className="flex items-center gap-2.5 pr-2">
        <span className="grid h-7 w-7 place-items-center rounded-[8px] bg-gradient-to-br from-[#4f8cff] to-[#2f6df6] text-white">
          <Waypoints size={16} strokeWidth={2.4} />
        </span>
        <span className="text-[15px] font-semibold tracking-tight">ITSM</span>
      </Link>

      <label className="relative mx-auto hidden w-full max-w-[420px] sm:block">
        <span className="sr-only">Buscar</span>
        <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" />
        <input
          type="search"
          placeholder="Buscar chamados e ativos"
          className="h-9 w-full rounded-lg border border-line bg-panel/80 pl-9 pr-3 text-[13px] text-ink placeholder:text-ink-3 focus:border-line-strong"
        />
      </label>

      <div className="ml-auto flex items-center gap-1 sm:ml-0">
        <Link
          href="/tickets"
          className="mr-2 inline-flex h-8 items-center gap-1.5 rounded-full border border-ask/70 bg-ask/10 px-3.5 text-[12.5px] font-medium text-ink shadow-[0_0_18px_-4px_rgba(255,77,109,0.55)] transition-colors hover:bg-ask/20"
        >
          <Plus size={14} className="text-ask" />
          Novo chamado
        </Link>
        <IconButton label="Notificações"><Bell size={16} /></IconButton>
        <IconButton label="Ajuda"><CircleHelp size={16} /></IconButton>
        <IconButton label="Configurações"><Settings size={16} /></IconButton>
        <Link
          href="/login"
          aria-label="Conta"
          className="ml-2 grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-[#f59e7a] to-[#c026d3] text-[11px] font-semibold text-white ring-1 ring-white/20"
        >
          MA
        </Link>
      </div>
    </header>
  );
}
