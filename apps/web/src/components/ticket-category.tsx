import { Boxes, HardDrive, KeyRound, Mail, Monitor, Printer, Server, Wifi, type LucideIcon } from 'lucide-react';
import { IconTile, type TileColor } from '@/components/ui/icon-tile';

const MAP: Record<string, { icon: LucideIcon; color: TileColor }> = {
  Rede: { icon: Wifi, color: 'blue' },
  Impressão: { icon: Printer, color: 'amber' },
  Acessos: { icon: KeyRound, color: 'violet' },
  Hardware: { icon: HardDrive, color: 'rose' },
  Software: { icon: Monitor, color: 'indigo' },
  'E-mail': { icon: Mail, color: 'pink' },
  Infraestrutura: { icon: Server, color: 'teal' },
};

export function CategoryTile({ category }: { category: string }) {
  const { icon, color } = MAP[category] ?? { icon: Boxes, color: 'indigo' as const };
  return <IconTile icon={icon} color={color} />;
}
