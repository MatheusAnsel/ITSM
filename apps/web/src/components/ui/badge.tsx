import { cn } from '@/lib/cn';
import { PRIORITY_LABEL, SLA_LABEL, STATUS_LABEL, ASSET_STATUS_LABEL, ASSET_TYPE_LABEL } from '@/lib/labels';
import type { AssetStatus, AssetType, Priority, SlaIndicator, TicketStatus } from '@/lib/types';

type Tone = 'blue' | 'violet' | 'green' | 'amber' | 'red' | 'gray';

const TONE: Record<Tone, string> = {
  blue: 'border-info/50 text-info',
  violet: 'border-violet/50 text-violet',
  green: 'border-ok/50 text-ok',
  amber: 'border-warn/50 text-warn',
  red: 'border-bad/50 text-bad',
  gray: 'border-line-strong text-ink-2',
};

// Selo no estilo da referência: caixa alta, contorno fino e texto pequeno.
export function Badge({ tone = 'gray', children }: { tone?: Tone; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-[5px] border bg-white/[0.02] px-1.5 py-[3px] text-[10px] font-semibold uppercase leading-none tracking-[0.06em] whitespace-nowrap',
        TONE[tone],
      )}
    >
      {children}
    </span>
  );
}

const PRIORITY_TONE: Record<Priority, Tone> = { LOW: 'gray', MEDIUM: 'blue', HIGH: 'amber', CRITICAL: 'red' };
export const PriorityBadge = ({ value }: { value: Priority }) => (
  <Badge tone={PRIORITY_TONE[value]}>{PRIORITY_LABEL[value]}</Badge>
);

const STATUS_TONE: Record<TicketStatus, Tone> = {
  OPEN: 'blue',
  IN_PROGRESS: 'violet',
  WAITING_USER: 'amber',
  RESOLVED: 'green',
  CLOSED: 'gray',
  CANCELLED: 'gray',
};
export const StatusBadge = ({ value }: { value: TicketStatus }) => (
  <Badge tone={STATUS_TONE[value]}>{STATUS_LABEL[value]}</Badge>
);

const SLA_TONE: Record<SlaIndicator, Tone> = { OK: 'green', AT_RISK: 'amber', BREACHED: 'red' };
export const SlaBadge = ({ value }: { value: SlaIndicator }) => (
  <Badge tone={SLA_TONE[value]}>{SLA_LABEL[value]}</Badge>
);

const ASSET_STATUS_TONE: Record<AssetStatus, Tone> = {
  IN_STOCK: 'blue',
  IN_USE: 'green',
  MAINTENANCE: 'amber',
  RETIRED: 'gray',
};
export const AssetStatusBadge = ({ value }: { value: AssetStatus }) => (
  <Badge tone={ASSET_STATUS_TONE[value]}>{ASSET_STATUS_LABEL[value]}</Badge>
);
export const AssetTypeBadge = ({ value }: { value: AssetType }) => (
  <Badge tone="violet">{ASSET_TYPE_LABEL[value]}</Badge>
);
