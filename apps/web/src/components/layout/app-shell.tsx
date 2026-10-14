'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Suspense, useEffect } from 'react';
import { useAuth } from '@/components/auth/auth-provider';
import { Loading } from '@/components/ui/states';
import { Sidebar } from './sidebar';
import { Topbar } from './topbar';

// Janela flutuante com cantos arredondados sobre o fundo colorido (referência). Também é a
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
    <>
      <div className="backdrop" aria-hidden />
      <div className="relative z-10 flex min-h-screen items-center justify-center p-3 sm:p-6 lg:p-10">
        <div className="window flex h-[min(860px,calc(100vh-1.5rem))] w-full max-w-[1180px] flex-col overflow-hidden">
          {booting || !user ? (
            <Loading label="Verificando sessão..." />
          ) : (
            <>
              <Suspense>
                <Topbar />
              </Suspense>
              <div className="flex min-h-0 flex-1">
                <Sidebar role={user.role} />
                <main className="scroll-thin min-w-0 flex-1 overflow-y-auto p-6">{children}</main>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
