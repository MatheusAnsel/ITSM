'use client';

import { useState } from 'react';
import { Dialog } from '@/components/ui/dialog';
import { Button, Field, FormError, Input, Select, Textarea } from '@/components/ui/form';
import { useAsync } from '@/hooks/use-async';
import { ApiError, createAsset, listDirectory, updateAsset } from '@/lib/api';
import { ASSET_STATUS_LABEL, ASSET_TYPE_LABEL } from '@/lib/labels';
import { ASSET_STATUSES, ASSET_TYPES, type Asset, type AssetStatus, type AssetType } from '@/lib/types';

// Criação e edição usam o mesmo formulário; na edição, campos limpos viram null para a API apagar o valor.
export function AssetFormDialog({
  open,
  asset,
  onClose,
  onSaved,
}: {
  open: boolean;
  asset?: Asset;
  onClose: () => void;
  onSaved: (saved: Asset) => void;
}) {
  const users = useAsync(open ? listDirectory : () => Promise.resolve([]), [open]);
  const [tag, setTag] = useState(asset?.tag ?? '');
  const [name, setName] = useState(asset?.name ?? '');
  const [type, setType] = useState<AssetType>(asset?.type ?? 'NOTEBOOK');
  const [status, setStatus] = useState<AssetStatus>(asset?.status ?? 'IN_STOCK');
  const [serial, setSerial] = useState(asset?.serialNumber ?? '');
  const [purchase, setPurchase] = useState(asset?.purchaseDate?.slice(0, 10) ?? '');
  const [notes, setNotes] = useState(asset?.notes ?? '');
  const [assignedToId, setAssignedToId] = useState(asset?.assignedToId ?? '');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // RN-09: em uso exige responsável; aposentado não pode ter.
  const needsOwner = status === 'IN_USE' && !assignedToId;
  const retiredWithOwner = status === 'RETIRED' && !!assignedToId;
  const valid = tag.trim().length >= 2 && name.trim().length >= 2 && !needsOwner && !retiredWithOwner;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const body = {
        tag: tag.trim(),
        name: name.trim(),
        type,
        status,
        serialNumber: serial.trim() || (asset ? null : undefined),
        purchaseDate: purchase || (asset ? null : undefined),
        notes: notes.trim() || (asset ? null : undefined),
        assignedToId: assignedToId || (asset ? null : undefined),
      };
      onSaved(asset ? await updateAsset(asset.id, body) : await createAsset(body));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Erro inesperado');
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title={asset ? `Editar ${asset.tag}` : 'Novo ativo'} wide>
      <form onSubmit={submit} className="space-y-3.5" noValidate>
        <div className="grid gap-3.5 sm:grid-cols-2">
          <Field label="Patrimônio" hint="Ex.: NB-0042">
            <Input value={tag} onChange={(e) => setTag(e.target.value)} maxLength={40} required />
          </Field>
          <Field label="Nome">
            <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={120} required />
          </Field>
          <Field label="Tipo">
            <Select value={type} onChange={(e) => setType(e.target.value as AssetType)}>
              {ASSET_TYPES.map((t) => (
                <option key={t} value={t}>{ASSET_TYPE_LABEL[t]}</option>
              ))}
            </Select>
          </Field>
          <Field label="Situação">
            <Select value={status} onChange={(e) => setStatus(e.target.value as AssetStatus)}>
              {ASSET_STATUSES.map((s) => (
                <option key={s} value={s}>{ASSET_STATUS_LABEL[s]}</option>
              ))}
            </Select>
          </Field>
          <Field
            label="Responsável"
            error={needsOwner ? 'Ativo em uso exige responsável' : retiredWithOwner ? 'Ativo aposentado não pode ter responsável' : null}
          >
            <Select value={assignedToId} onChange={(e) => setAssignedToId(e.target.value)}>
              <option value="">Sem responsável</option>
              {users.data?.map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </Select>
          </Field>
          <Field label="Número de série">
            <Input value={serial} onChange={(e) => setSerial(e.target.value)} maxLength={120} />
          </Field>
          <Field label="Data de compra">
            <Input type="date" value={purchase} onChange={(e) => setPurchase(e.target.value)} />
          </Field>
        </div>
        <Field label="Observações">
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={1000} rows={3} />
        </Field>
        <FormError message={error} />
        <div className="flex justify-end gap-2">
          <Button onClick={onClose} disabled={busy}>Cancelar</Button>
          <Button type="submit" variant="primary" disabled={!valid || busy}>
            {busy ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
