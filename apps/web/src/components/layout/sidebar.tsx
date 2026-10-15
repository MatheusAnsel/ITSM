'use client';

import { Boxes, FileClock, Gauge, LayoutDashboard, Tags, Ticket, Users, type LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/cn';
import type { Role } from '@/lib/types';

interface Item {
  label: string;
  href: string;
  icon: LucideIcon;
  roles: Role[];
}

const ALL: Role[] = ['ADMIN', 'MANAGER', 'AGENT', 'REQUESTER'];
const STAFF: Role[] = ['ADMIN', 'MANAGER', 'AGENT'];

export const NAV_ITEMS: Item[] = [
  { label: 'Painel', href: '/dashboard', icon: LayoutDashboard, roles: ['ADMIN', 'MANAGER'] },
  { label: 'Chamados', href: '/tickets', icon: Ticket, roles: ALL },
  { label: 'Ativos', href: '/assets', icon: Boxes, roles: STAFF },
  { label: 'SLA', href: '/sla', icon: Gauge, roles: STAFF },
  { label: 'Categorias', href: '/categories', icon: Tags, roles: ['ADMIN'] },
  { label: 'Usuários', href: '/users', icon: Users, roles: ['ADMIN'] },
  { label: 'Auditoria', href: '/audit', icon: FileClock, roles: ['ADMIN'] },
];

export function Sidebar({ role }: { role: Role }) {
  const pathname = usePathname();
  const items = NAV_ITEMS.filter((i) => i.roles.includes(role));
  return (
    <>
      <nav aria-label="Principal" className="hidden w-[208px] shrink-0 border-r border-line bg-panel p-3 md:block">
        <ul className="flex flex-col gap-0.5">
          {items.map(({ label, href, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex items-center gap-3 rounded-md px-3 py-2 text-[13.5px] transition-colors',
                    active ? 'bg-brand/10 font-medium text-brand' : 'text-ink-2 hover:bg-ink/5 hover:text-ink',
                  )}
                >
                  <Icon size={16} strokeWidth={1.8} />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      {/* Em telas estreitas a navegação vira uma faixa horizontal no topo do conteúdo. */}
      <nav aria-label="Principal (compacto)" className="absolute inset-x-0 top-14 z-10 flex gap-1 overflow-x-auto border-b border-line bg-panel px-3 py-2 md:hidden">
        {items.map(({ label, href, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex shrink-0 items-center gap-2 rounded-md px-3 py-1.5 text-[13px]',
                active ? 'bg-brand/10 font-medium text-brand' : 'text-ink-2',
              )}
            >
              <Icon size={15} strokeWidth={1.8} />
              {label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
