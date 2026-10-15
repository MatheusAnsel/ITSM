import type { LucideIcon } from 'lucide-react';

export type TileColor = 'pink' | 'violet' | 'blue' | 'teal' | 'amber' | 'rose' | 'indigo';

// Ícone em quadrado neutro e plano. O parâmetro de cor foi mantido só por compatibilidade das
// chamadas; o visual não usa mais cores por categoria.
export function IconTile({ icon: Icon, size = 28 }: { icon: LucideIcon; color?: TileColor; size?: number }) {
  return (
    <span
      className="grid shrink-0 place-items-center rounded-md border border-line bg-panel-2 text-ink-2"
      style={{ width: size, height: size }}
      aria-hidden
    >
      <Icon size={Math.round(size * 0.55)} strokeWidth={1.9} />
    </span>
  );
}
