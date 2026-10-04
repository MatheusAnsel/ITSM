import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';

export type TileColor = 'pink' | 'violet' | 'blue' | 'teal' | 'amber' | 'rose' | 'indigo';

const GRADIENT: Record<TileColor, string> = {
  pink: 'from-[#ff5ea8] to-[#c026d3]',
  violet: 'from-[#8b5cf6] to-[#6d28d9]',
  blue: 'from-[#3b82f6] to-[#1d4ed8]',
  teal: 'from-[#2dd4bf] to-[#0f766e]',
  amber: 'from-[#fbbf24] to-[#d97706]',
  rose: 'from-[#fb7185] to-[#be123c]',
  indigo: 'from-[#818cf8] to-[#4338ca]',
};

// Ícone em bloco colorido com cantos arredondados, como os ícones dos apps na referência.
export function IconTile({ icon: Icon, color, size = 28 }: { icon: LucideIcon; color: TileColor; size?: number }) {
  return (
    <span
      className={cn('grid shrink-0 place-items-center rounded-[7px] bg-gradient-to-br text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]', GRADIENT[color])}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <Icon size={Math.round(size * 0.55)} strokeWidth={2.2} />
    </span>
  );
}
