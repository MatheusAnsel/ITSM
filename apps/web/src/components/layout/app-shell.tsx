'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Suspense, useEffect } from 'react';
import { useAuth } from '@/components/auth/auth-provider';
import { Loading } from '@/components/ui/states';
import { Sidebar } from './sidebar';
import { Topbar } from './topbar';

// Estrutura de tela cheia (barra superior, menu lateral e conteúdo). Também é a
// guarda de rotas do lado do cliente: sem sessão, volta para o login. A autorização de verdade
// continua na API; aqui só evita mostrar telas que dariam 401/403.
export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, booting } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!booting && !user) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [booting, user, router, pathname]);

  return (
    <div className="relative flex h-screen flex-col bg-canvas">
      {booting || !user ? (
            <Loading label="Verificando sessão..." />
          ) : (
            <>
              <Suspense>
                <Topbar />
              </Suspense>
              <div className="flex min-h-0 flex-1">
                <Sidebar role={user.role} />
                <main className="scroll-thin min-w-0 flex-1 overflow-y-auto p-6 lg:p-8">{children}</main>
              </div>
            </>
      )}
    </div>
  );
}
