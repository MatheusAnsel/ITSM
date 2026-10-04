import { Download, Maximize2, Share2 } from 'lucide-react';
import type { Metadata } from 'next';
import { Laptop } from 'lucide-react';
import { AssetStatusBadge, AssetTypeBadge } from '@/components/ui/badge';
import { DataTable, type Column } from '@/components/ui/data-table';
import { DemoNotice } from '@/components/ui/demo-notice';
import { IconTile } from '@/components/ui/icon-tile';
import { PageHeader } from '@/components/ui/page-header';
import { DEMO_ASSETS } from '@/lib/demo-data';
import type { AssetRow } from '@/lib/types';

export const metadata: Metadata = { title: 'Ativos' };

const columns: Column<AssetRow>[] = [
  {
    key: 'name',
    header: 'Ativo',
    render: (a) => (
      <div className="flex items-center gap-3">
        <IconTile icon={Laptop} color="violet" />
        <div>
          <div className="font-medium text-ink">{a.name}</div>
          <div className="text-xs text-ink-3">{a.tag}</div>
        </div>
      </div>
    ),
  },
  { key: 'type', header: 'Tipo', width: '150px', render: (a) => <AssetTypeBadge value={a.type} /> },
  { key: 'owner', header: 'Responsável', width: '170px', render: (a) => <span className="text-ink-2">{a.owner ?? 'Sem responsável'}</span> },
  { key: 'status', header: 'Situação', align: 'right', width: '150px', render: (a) => <AssetStatusBadge value={a.status} /> },
];

export default function AssetsPage() {
  return (
    <>
      <PageHeader
        title="Ativos de TI"
        subtitle={`${DEMO_ASSETS.length} ativos cadastrados`}
        actions={[
          { label: 'Compartilhar', icon: Share2 },
          { label: 'Exportar', icon: Download },
          { label: 'Tela cheia', icon: Maximize2 },
        ]}
      />
      <DemoNotice />
      <DataTable columns={columns} rows={DEMO_ASSETS} rowKey={(a) => a.tag} />
    </>
  );
}
