import { Sidebar } from './sidebar';
import { Topbar } from './topbar';

// Janela flutuante com cantos arredondados sobre o fundo colorido (referência).
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="backdrop" aria-hidden />
      <div className="relative z-10 flex min-h-screen items-center justify-center p-3 sm:p-6 lg:p-10">
        <div className="window flex h-[min(860px,calc(100vh-1.5rem))] w-full max-w-[1180px] flex-col overflow-hidden">
          <Topbar />
          <div className="flex min-h-0 flex-1">
            <Sidebar />
            <main className="scroll-thin min-w-0 flex-1 overflow-y-auto p-6">{children}</main>
          </div>
        </div>
      </div>
    </>
  );
}
