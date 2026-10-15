'use client';

import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { PRIORITY_LABEL } from '@/lib/labels';
import { PRIORITIES, type DashboardSummary, type VolumeStat } from '@/lib/types';

const AXIS = { fill: '#667085', fontSize: 11 };
const TOOLTIP = {
  contentStyle: { background: '#ffffff', border: '1px solid #e4e7ec', borderRadius: 8, fontSize: 12, color: '#172033', boxShadow: '0 1px 3px rgba(16,24,40,0.1)' },
  labelStyle: { color: '#475467' },
  cursor: { stroke: '#cdd2da' },
};
const PRIORITY_COLOR = { LOW: '#98a2b3', MEDIUM: '#1d4ed8', HIGH: '#b45309', CRITICAL: '#b42318' } as const;

export function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-line bg-panel p-4">
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
                <CartesianGrid stroke="#e4e7ec" vertical={false} />
                <XAxis dataKey="day" tickFormatter={shortDay} tick={AXIS} tickLine={false} axisLine={false} interval={4} />
                <YAxis tick={AXIS} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip {...TOOLTIP} labelFormatter={(l) => shortDay(String(l))} />
                <Area type="monotone" dataKey="created" name="Abertos" stroke="#1d4ed8" strokeWidth={2} fill="#1d4ed8" fillOpacity={0.08} />
                <Area type="monotone" dataKey="resolved" name="Resolvidos" stroke="#15803d" strokeWidth={2} fill="#15803d" fillOpacity={0.06} />
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
              <YAxis type="category" dataKey="name" tick={{ ...AXIS, fill: '#475467', fontSize: 12 }} tickLine={false} axisLine={false} width={56} />
              <Tooltip {...TOOLTIP} cursor={{ fill: 'rgba(16,24,40,0.04)' }} />
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
