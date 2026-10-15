import { Waypoints } from 'lucide-react';

export function AuthCard({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <main className="grid min-h-screen place-items-center bg-canvas p-4">
      <div className="w-full max-w-[400px] rounded-lg border border-line bg-panel p-7 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-md bg-brand text-white">
            <Waypoints size={18} strokeWidth={2.2} />
          </span>
          <div>
            <h1 className="text-lg font-semibold leading-tight tracking-tight">{title}</h1>
            <p className="text-xs text-ink-2">{subtitle}</p>
          </div>
        </div>
        {children}
      </div>
    </main>
  );
}
