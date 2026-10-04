'use client';

import { Waypoints } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ApiError, login } from '@/lib/api';

const field =
  'h-10 w-full rounded-lg border border-line bg-panel px-3 text-[14px] text-ink placeholder:text-ink-3 focus:border-line-strong';

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      router.push('/dashboard');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Erro inesperado');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="window w-full max-w-[380px] p-7" noValidate>
      <div className="mb-6 flex items-center gap-2.5">
        <span className="grid h-9 w-9 place-items-center rounded-[10px] bg-gradient-to-br from-[#4f8cff] to-[#2f6df6] text-white">
          <Waypoints size={18} strokeWidth={2.4} />
        </span>
        <div>
          <h1 className="text-lg font-semibold leading-tight tracking-tight">Entrar no ITSM</h1>
          <p className="text-xs text-ink-2">Gestão de chamados e ativos de TI</p>
        </div>
      </div>

      <label className="mb-3 block">
        <span className="mb-1.5 block text-xs font-medium text-ink-2">E-mail</span>
        <input type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@empresa.com" className={field} />
      </label>
      <label className="mb-4 block">
        <span className="mb-1.5 block text-xs font-medium text-ink-2">Senha</span>
        <input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} className={field} />
      </label>

      {error && (
        <p role="alert" className="mb-4 rounded-lg border border-bad/40 bg-bad/10 px-3 py-2 text-[13px] text-bad">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading || !email || !password}
        className="h-10 w-full rounded-lg border border-ask/70 bg-ask/10 text-[14px] font-medium text-ink shadow-[0_0_22px_-6px_rgba(255,77,109,0.6)] transition-colors hover:bg-ask/20 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? 'Entrando...' : 'Entrar'}
      </button>
    </form>
  );
}
