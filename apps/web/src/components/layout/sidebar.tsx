'use client';

import {
  Boxes,
  FileClock,
  Gauge,
  LayoutDashboard,
  Ticket,
  Users,
  Tags,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/cn';

interface Item {
  label: string;
  href?: string;
  icon: LucideIcon;
}

// Itens sem href ainda não têm tela; ficam visíveis, porém desabilitados.
const ITEMS: Item[] = [
  { label: 'Painel', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Chamados', href: '/tickets', icon: Ticket },
  { label: 'Ativos', href: '/assets', icon: Boxes },
  { label: 'SLA', icon: Gauge },
  { label: 'Categorias', icon: Tags },
  { label: 'Usuários', icon: Users },
  { label: 'Auditoria', icon: FileClock },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <nav aria-label="Principal" className="hidden w-[188px] shrink-0 border-r border-line p-3 md:block">
      <ul className="flex flex-col gap-0.5">
        {ITEMS.map(({ label, href, icon: Icon }) => {
          const active = href ? pathname === href || pathname.startsWith(`${href}/`) : false;
          const base = 'flex items-center gap-3 rounded-lg px-3 py-2 text-[13.5px] transition-colors';
          return (
            <li key={label}>
              {href ? (
                <Link
                  href={href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(base, active ? 'bg-white/[0.07] text-ink' : 'text-ink-2 hover:bg-white/[0.04] hover:text-ink')}
                >
                  <Icon size={16} strokeWidth={1.8} />
                  {label}
                </Link>
              ) : (
                <span aria-disabled="true" title="Em breve" className={cn(base, 'cursor-not-allowed text-ink-3/70')}>
                  <Icon size={16} strokeWidth={1.8} />
                  {label}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
