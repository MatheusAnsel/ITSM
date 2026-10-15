'use client';

import { Plus } from 'lucide-react';
import { useState } from 'react';
import { CategoryTile } from '@/components/ticket-category';
import { Badge } from '@/components/ui/badge';
import { Dialog } from '@/components/ui/dialog';
import { Button, Field, FormError, Input } from '@/components/ui/form';
import { PageHeader } from '@/components/ui/page-header';
import { ErrorState, Loading } from '@/components/ui/states';
import { useAsync } from '@/hooks/use-async';
import { ApiError, createCategory, listCategories, updateCategory } from '@/lib/api';
import type { Category } from '@/lib/types';

function CategoryDialog({ category, onClose, onSaved }: { category?: Category; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(category?.name ?? '');
  const [description, setDescription] = useState(category?.description ?? '');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const body = { name: name.trim(), description: description.trim() || undefined };
      if (category) await updateCategory(category.id, body);
      else await createCategory(body);
      onSaved();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Erro inesperado');
      setBusy(false);
    }
  }

  return (
    <Dialog open onClose={onClose} title={category ? 'Editar categoria' : 'Nova categoria'}>
      <form onSubmit={submit} className="space-y-3.5" noValidate>
        <Field label="Nome">
          <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} autoFocus />
        </Field>
        <Field label="Descrição (opcional)">
          <Input value={description} onChange={(e) => setDescription(e.target.value)} maxLength={255} />
        </Field>
        <FormError message={error} />
        <div className="flex justify-end gap-2">
          <Button onClick={onClose} disabled={busy}>Cancelar</Button>
          <Button type="submit" variant="primary" disabled={name.trim().length < 2 || busy}>{busy ? 'Salvando...' : 'Salvar'}</Button>
        </div>
      </form>
    </Dialog>
  );
}

export function CategoriesView() {
  const categories = useAsync(listCategories, []);
  const [dialog, setDialog] = useState<{ category?: Category } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // RN-13: categorias são desativadas, nunca excluídas.
  async function toggle(c: Category) {
    setError(null);
    try {
      await updateCategory(c.id, { active: !c.active });
      categories.reload();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Erro inesperado');
    }
  }

  return (
    <>
      <PageHeader
        title="Categorias"
        subtitle="Categorias desativadas deixam de aparecer para novos chamados, mas o histórico é mantido."
        actions={
          <Button variant="primary" onClick={() => setDialog({})}>
            <Plus size={14} /> Nova categoria
          </Button>
        }
      />
      <FormError message={error} />
      {categories.error ? (
        <ErrorState message={categories.error} onRetry={categories.reload} />
      ) : !categories.data ? (
        <Loading />
      ) : (
        <ul className="overflow-hidden rounded-lg border border-line bg-panel">
          {categories.data.map((c) => (
            <li key={c.id} className="flex items-center gap-3 border-b border-line/70 px-4 py-3 last:border-0">
              <CategoryTile category={c.name} />
              <div className="min-w-0 flex-1">
                <div className={`text-[13.5px] font-medium ${c.active ? 'text-ink' : 'text-ink-3'}`}>{c.name}</div>
                {c.description && <div className="truncate text-xs text-ink-3">{c.description}</div>}
              </div>
              {!c.active && <Badge>Inativa</Badge>}
              <Button size="sm" onClick={() => setDialog({ category: c })}>Editar</Button>
              <Button size="sm" variant={c.active ? 'danger' : 'secondary'} onClick={() => void toggle(c)}>
                {c.active ? 'Desativar' : 'Reativar'}
              </Button>
            </li>
          ))}
        </ul>
      )}
      {dialog && (
        <CategoryDialog
          category={dialog.category}
          onClose={() => setDialog(null)}
          onSaved={() => {
            setDialog(null);
            categories.reload();
          }}
        />
      )}
    </>
  );
}
