import { Waypoints } from 'lucide-react';

export function AuthCard({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <>
      <div className="backdrop" aria-hidden />
      <main className="relative z-10 grid min-h-screen place-items-center p-4">
        <div className="window w-full max-w-[400px] p-7">
          <div className="mb-6 flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-[10px] bg-gradient-to-br from-[#4f8cff] to-[#2f6df6] text-white">
              <Waypoints size={18} strokeWidth={2.4} />
            </span>
            <div>
              <h1 className="text-lg font-semibold leading-tight tracking-tight">{title}</h1>
              <p className="text-xs text-ink-2">{subtitle}</p>
            </div>
          </div>
          {children}
        </div>
      </main>
    </>
  );
}
