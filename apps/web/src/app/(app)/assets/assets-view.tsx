'use client';

import { Laptop, Plus } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useUser } from '@/components/auth/auth-provider';
import { AssetStatusBadge, AssetTypeBadge } from '@/components/ui/badge';
import { type Column, DataTable } from '@/components/ui/data-table';
import { Button, Input, Select } from '@/components/ui/form';
import { IconTile } from '@/components/ui/icon-tile';
import { PageHeader } from '@/components/ui/page-header';
import { Pagination } from '@/components/ui/pagination';
import { ErrorState, Loading } from '@/components/ui/states';
import { useAsync } from '@/hooks/use-async';
import { listAssets } from '@/lib/api';
import { ASSET_STATUS_LABEL, ASSET_TYPE_LABEL } from '@/lib/labels';
import { ASSET_STATUSES, ASSET_TYPES, type Asset, type AssetStatus, type AssetType, isManager } from '@/lib/types';
import { AssetFormDialog } from './asset-form';

const PAGE_SIZE = 15;

export function AssetsView() {
  const user = useUser();
  const canEdit = isManager(user.role);
  const [term, setTerm] = useState('');
  const [q, setQ] = useState('');
  const [type, setType] = useState<AssetType | ''>('');
  const [status, setStatus] = useState<AssetStatus | ''>('');
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      setQ(term.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [term]);

  const assets = useAsync(() => listAssets({ q: q || undefined, type, status, page, pageSize: PAGE_SIZE }), [q, type, status, page]);

  const columns: Column<Asset>[] = [
    {
      key: 'name',
      header: 'Ativo',
      render: (a) => (
        <Link href={`/assets/${a.id}`} className="flex items-center gap-3">
          <IconTile icon={Laptop} color="violet" />
          <div className="min-w-0">
            <div className="truncate font-medium text-ink hover:underline">{a.name}</div>
            <div className="text-xs text-ink-3">{a.tag}</div>
          </div>
        </Link>
      ),
    },
    { key: 'type', header: 'Tipo', width: '140px', render: (a) => <AssetTypeBadge value={a.type} /> },
    { key: 'owner', header: 'Responsável', width: '180px', render: (a) => <span className="text-ink-2">{a.assignedTo?.name ?? 'Sem responsável'}</span> },
    { key: 'status', header: 'Situação', align: 'right', width: '140px', render: (a) => <AssetStatusBadge value={a.status} /> },
  ];

  return (
    <>
      <PageHeader
        title="Ativos de TI"
        subtitle={assets.data ? `${assets.data.total} ${assets.data.total === 1 ? 'ativo' : 'ativos'}` : undefined}
        actions={
          canEdit && (
            <Button variant="primary" onClick={() => setCreating(true)}>
              <Plus size={14} /> Novo ativo
            </Button>
          )
        }
      />
      <div className="mb-4 flex flex-wrap gap-2">
        <Input
          type="search"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Buscar por patrimônio, nome ou série"
          aria-label="Buscar ativos"
          maxLength={100}
          className="min-w-[240px] flex-1"
        />
        <Select value={type} onChange={(e) => { setType(e.target.value as AssetType | ''); setPage(1); }} aria-label="Tipo" className="w-auto">
          <option value="">Todos os tipos</option>
          {ASSET_TYPES.map((t) => <option key={t} value={t}>{ASSET_TYPE_LABEL[t]}</option>)}
        </Select>
        <Select value={status} onChange={(e) => { setStatus(e.target.value as AssetStatus | ''); setPage(1); }} aria-label="Situação" className="w-auto">
          <option value="">Todas as situações</option>
          {ASSET_STATUSES.map((s) => <option key={s} value={s}>{ASSET_STATUS_LABEL[s]}</option>)}
        </Select>
      </div>

      {assets.error ? (
        <ErrorState message={assets.error} onRetry={assets.reload} />
      ) : !assets.data ? (
        <Loading />
      ) : (
        <div className={assets.loading ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
          <DataTable columns={columns} rows={assets.data.items} rowKey={(a) => a.id} empty="Nenhum ativo encontrado" />
          <Pagination page={page} pageSize={PAGE_SIZE} total={assets.data.total} onChange={setPage} />
        </div>
      )}

      {creating && (
        <AssetFormDialog
          open
          onClose={() => setCreating(false)}
          onSaved={() => {
            setCreating(false);
            assets.reload();
          }}
        />
      )}
    </>
  );
}
