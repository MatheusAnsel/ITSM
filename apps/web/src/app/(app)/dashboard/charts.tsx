'use client';

import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { PRIORITY_LABEL } from '@/lib/labels';
import { PRIORITIES, type DashboardSummary, type VolumeStat } from '@/lib/types';

const AXIS = { fill: '#6e6e79', fontSize: 11 };
const TOOLTIP = {
  contentStyle: { background: '#15151a', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 10, fontSize: 12, color: '#ececef' },
  labelStyle: { color: '#a3a3ad' },
  cursor: { stroke: 'rgba(255,255,255,0.12)' },
};
const PRIORITY_COLOR = { LOW: '#6e6e79', MEDIUM: '#5b9dff', HIGH: '#f5b82e', CRITICAL: '#ff5d6c' } as const;

export function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-line bg-panel/60 p-4">
      <h2 className="mb-3 text-[13px] font-medium text-ink-2">{title}</h2>
      {children}
    </section>
  );
}

const shortDay = (iso: string) => iso.slice(8, 10) + '/' + iso.slice(5, 7);

export function Charts({ volume, byPriority, loading }: { volume: VolumeStat[]; byPriority: DashboardSummary['byPriority']; loading: boolean }) {
  const priorityData = PRIORITIES.slice()
    .reverse()
    .map((p) => ({ name: PRIORITY_LABEL[p], total: byPriority[p], color: PRIORITY_COLOR[p] }));

  return (
    <div className="mb-3 grid gap-3 lg:grid-cols-[1.7fr_1fr]">
      <Card title="Volume diário (últimos 30 dias)">
        <div className="h-[240px]">
          {loading ? (
            <div className="grid h-full place-items-center text-xs text-ink-3">Carregando...</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={volume} margin={{ top: 4, right: 8, left: -22, bottom: 0 }}>
                <defs>
                  <linearGradient id="gOpen" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#5b9dff" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="#5b9dff" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gDone" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#a78bfa" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#a78bfa" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis dataKey="day" tickFormatter={shortDay} tick={AXIS} tickLine={false} axisLine={false} interval={4} />
                <YAxis tick={AXIS} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip {...TOOLTIP} labelFormatter={(l) => shortDay(String(l))} />
                <Area type="monotone" dataKey="created" name="Abertos" stroke="#5b9dff" strokeWidth={2} fill="url(#gOpen)" />
                <Area type="monotone" dataKey="resolved" name="Resolvidos" stroke="#a78bfa" strokeWidth={2} fill="url(#gDone)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>

      <Card title="Chamados por prioridade">
        <div className="h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={priorityData} layout="vertical" margin={{ top: 4, right: 12, left: 4, bottom: 0 }}>
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="name" tick={{ ...AXIS, fill: '#a3a3ad', fontSize: 12 }} tickLine={false} axisLine={false} width={56} />
              <Tooltip {...TOOLTIP} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
              <Bar dataKey="total" name="Chamados" radius={[0, 6, 6, 0]} barSize={18}>
                {priorityData.map((p) => (
                  <Cell key={p.name} fill={p.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}
