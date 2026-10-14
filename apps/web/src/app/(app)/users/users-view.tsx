'use client';

import { Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useUser } from '@/components/auth/auth-provider';
import { Badge } from '@/components/ui/badge';
import { type Column, DataTable } from '@/components/ui/data-table';
import { Dialog } from '@/components/ui/dialog';
import { Button, Field, FormError, Input, Select } from '@/components/ui/form';
import { PageHeader } from '@/components/ui/page-header';
import { Pagination } from '@/components/ui/pagination';
import { ErrorState, Loading } from '@/components/ui/states';
import { useAsync } from '@/hooks/use-async';
import { ApiError, createUser, listUsers, updateUser } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { ROLE_LABEL } from '@/lib/labels';
import { ROLES, type Role, type UserRecord } from '@/lib/types';

const PAGE_SIZE = 15;

function UserDialog({ target, onClose, onSaved }: { target?: UserRecord; onClose: () => void; onSaved: () => void }) {
  const me = useUser();
  const [name, setName] = useState(target?.name ?? '');
  const [email, setEmail] = useState(target?.email ?? '');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>(target?.role ?? 'REQUESTER');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const self = target?.id === me.id;
  const valid = name.trim().length >= 2 && (target || (email && password.length >= 10));

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (target) await updateUser(target.id, { name: name.trim(), role });
      else await createUser({ name: name.trim(), email: email.trim(), password, role });
      onSaved();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Erro inesperado');
      setBusy(false);
    }
  }

  return (
    <Dialog open onClose={onClose} title={target ? 'Editar usuário' : 'Novo usuário'}>
      <form onSubmit={submit} className="space-y-3.5" noValidate>
        <Field label="Nome"><Input value={name} onChange={(e) => setName(e.target.value)} maxLength={100} autoFocus /></Field>
        <Field label="E-mail">
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={254} disabled={!!target} />
        </Field>
        {!target && (
          <Field label="Senha inicial" hint="Ao menos 10 caracteres">
            <Input type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} maxLength={128} />
          </Field>
        )}
        <Field label="Perfil" hint={self ? 'Você não pode alterar o próprio perfil' : undefined}>
          <Select value={role} onChange={(e) => setRole(e.target.value as Role)} disabled={self}>
            {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
          </Select>
        </Field>
        <FormError message={error} />
        <div className="flex justify-end gap-2">
          <Button onClick={onClose} disabled={busy}>Cancelar</Button>
          <Button type="submit" variant="primary" disabled={!valid || busy}>{busy ? 'Salvando...' : 'Salvar'}</Button>
        </div>
      </form>
    </Dialog>
  );
}

export function UsersView() {
  const me = useUser();
  const [term, setTerm] = useState('');
  const [search, setSearch] = useState('');
  const [role, setRole] = useState<Role | ''>('');
  const [page, setPage] = useState(1);
  const [dialog, setDialog] = useState<{ target?: UserRecord } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(term.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [term]);

  const users = useAsync(() => listUsers({ search: search || undefined, role, page, pageSize: PAGE_SIZE }), [search, role, page]);

  async function toggleActive(u: UserRecord) {
    setError(null);
    try {
      await updateUser(u.id, { active: !u.active });
      users.reload();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Erro inesperado');
    }
  }

  const columns: Column<UserRecord>[] = [
    {
      key: 'name',
      header: 'Usuário',
      render: (u) => (
        <div>
          <div className={`font-medium ${u.active ? 'text-ink' : 'text-ink-3'}`}>{u.name}</div>
          <div className="text-xs text-ink-3">{u.email}</div>
        </div>
      ),
    },
    { key: 'role', header: 'Perfil', width: '140px', render: (u) => <Badge tone={u.role === 'ADMIN' ? 'red' : u.role === 'MANAGER' ? 'violet' : u.role === 'AGENT' ? 'blue' : 'gray'}>{ROLE_LABEL[u.role]}</Badge> },
    { key: 'since', header: 'Desde', width: '110px', render: (u) => <span className="text-ink-2">{formatDate(u.createdAt)}</span> },
    { key: 'active', header: 'Situação', width: '100px', render: (u) => (u.active ? <Badge tone="green">Ativo</Badge> : <Badge>Inativo</Badge>) },
    {
      key: 'actions',
      header: '',
      align: 'right',
      width: '190px',
      render: (u) => (
        <div className="flex justify-end gap-1.5">
          <Button size="sm" onClick={() => setDialog({ target: u })}>Editar</Button>
          {u.id !== me.id && (
            <Button size="sm" variant={u.active ? 'danger' : 'secondary'} onClick={() => void toggleActive(u)}>
              {u.active ? 'Desativar' : 'Reativar'}
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Usuários"
        subtitle="Usuários são desativados, nunca excluídos: o histórico dos chamados é preservado."
        actions={<Button variant="primary" onClick={() => setDialog({})}><Plus size={14} /> Novo usuário</Button>}
      />
      <div className="mb-4 flex flex-wrap gap-2">
        <Input type="search" value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Buscar por nome ou e-mail" aria-label="Buscar usuários" maxLength={100} className="min-w-[240px] flex-1" />
        <Select value={role} onChange={(e) => { setRole(e.target.value as Role | ''); setPage(1); }} aria-label="Perfil" className="w-auto">
          <option value="">Todos os perfis</option>
          {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
        </Select>
      </div>
      <FormError message={error} />
      {users.error ? (
        <ErrorState message={users.error} onRetry={users.reload} />
      ) : !users.data ? (
        <Loading />
      ) : (
        <div className={users.loading ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
          <DataTable columns={columns} rows={users.data.items} rowKey={(u) => u.id} empty="Nenhum usuário encontrado" />
          <Pagination page={page} pageSize={PAGE_SIZE} total={users.data.total} onChange={setPage} />
        </div>
      )}
      {dialog && (
        <UserDialog
          target={dialog.target}
          onClose={() => setDialog(null)}
          onSaved={() => {
            setDialog(null);
            users.reload();
          }}
        />
      )}
    </>
  );
}
