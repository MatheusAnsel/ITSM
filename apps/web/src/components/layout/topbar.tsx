'use client';

import { KeyRound, LogOut, Plus, Search, Waypoints } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/components/auth/auth-provider';
import { initials } from '@/lib/format';
import { ROLE_LABEL } from '@/lib/labels';

export function Topbar() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const [term, setTerm] = useState(params.get('q') ?? '');
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', close);
    };
  }, [menuOpen]);

  if (!user) return null;

  function search(event: React.FormEvent) {
    event.preventDefault();
    const q = term.trim();
    router.push(q ? `/tickets?q=${encodeURIComponent(q)}` : '/tickets');
  }

  return (
    <header className="relative z-20 flex h-14 shrink-0 items-center gap-3 border-b border-line bg-panel px-4">
      <Link href="/" className="flex items-center gap-2.5 pr-2" aria-label="ITSM, página inicial">
        <span className="grid h-7 w-7 place-items-center rounded-md bg-brand text-white">
          <Waypoints size={16} strokeWidth={2.4} />
        </span>
        <span className="text-[15px] font-semibold tracking-tight">ITSM</span>
      </Link>

      <form onSubmit={search} role="search" className="relative mx-auto hidden w-full max-w-[420px] sm:block">
        <label>
          <span className="sr-only">Buscar chamados</span>
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" />
          <input
            type="search"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Buscar chamados"
            maxLength={100}
            className="h-9 w-full rounded-md border border-line bg-panel-2 pl-9 pr-3 text-[13px] text-ink placeholder:text-ink-3 focus:border-line-strong"
          />
        </label>
      </form>

      <div className="ml-auto flex items-center gap-2 sm:ml-0">
        <Link
          href="/tickets/new"
          className="inline-flex h-8 items-center gap-1.5 rounded-md bg-brand px-3.5 text-[12.5px] font-medium text-white transition-colors hover:bg-brand-strong"
        >
          <Plus size={14} />
          <span className="hidden sm:inline">Novo chamado</span>
          <span className="sm:hidden">Novo</span>
        </Link>

        <div ref={menuRef} className="relative">
          <button
            type="button"
            aria-label={`Conta de ${user.name}`}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((o) => !o)}
            className="grid h-8 w-8 place-items-center rounded-full border border-line-strong bg-panel-2 text-[11px] font-semibold text-ink-2 hover:bg-ink/5"
          >
            {initials(user.name)}
          </button>
          {menuOpen && (
            <div role="menu" className="absolute right-0 top-10 w-[230px] rounded-lg border border-line bg-panel p-1.5 shadow-lg">
              <div className="border-b border-line px-3 pb-2.5 pt-2">
                <div className="truncate text-[13px] font-medium">{user.name}</div>
                <div className="truncate text-xs text-ink-3">{user.email}</div>
                <div className="mt-1 text-xs text-ink-2">{ROLE_LABEL[user.role]}</div>
              </div>
              <Link
                role="menuitem"
                href="/account"
                onClick={() => setMenuOpen(false)}
                className="mt-1 flex items-center gap-2.5 rounded-md px-3 py-2 text-[13px] text-ink-2 hover:bg-ink/[0.06] hover:text-ink"
              >
                <KeyRound size={14} /> Alterar senha
              </Link>
              <button
                role="menuitem"
                type="button"
                onClick={() => void signOut()}
                className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-[13px] text-ink-2 hover:bg-ink/[0.06] hover:text-ink"
              >
                <LogOut size={14} /> Sair
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
