import { useId } from 'react';
import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

/** Грифик палитраси (referens: Zenith). validate_palette.js дан ўтган тартиб; 5-чи ва ундан кейингилар — «Бошқа» (нейтрал) */
export const CHART = { c1: '#f54900', c2: '#009689', c3: '#0068a7', c4: '#d19b00', other: '#a3a3a3' } as const;
export const CATEGORICAL = [CHART.c1, CHART.c2, CHART.c3, CHART.c4];

const axisTick = { fontSize: 12, fill: '#737373' } as const;

export function ChartTooltip({ active, payload, label, unit }: { active?: boolean; payload?: any[]; label?: string; unit?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-md">
      {label && <p className="mb-1 font-medium text-slate-500">{label}</p>}
      {payload.map((p) => (
        <p key={p.dataKey ?? p.name} className="flex items-center gap-2 font-semibold text-slate-950 tnum">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: p.color ?? p.payload?.fill }} aria-hidden />
          {p.name ? `${p.name}: ` : ''}{p.value}{unit ?? ''}
        </p>
      ))}
    </div>
  );
}

/** KPI карточка остидаги кичик график (оқ фонда градиент, ўқсиз) */
export function Spark({ data, color, name, unit }: { data: { label: string; v: number }[]; color: string; name: string; unit?: string }) {
  const id = useId().replace(/:/g, '');
  return (
    <div className="h-[64px] w-full" role="img" aria-label={`${name}: охирги ${data.length} ой динамикаси`}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 6, right: 0, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity={0.22} /><stop offset="100%" stopColor={color} stopOpacity={0} /></linearGradient>
          </defs>
          <Tooltip content={<ChartTooltip unit={unit} />} cursor={{ stroke: color, strokeOpacity: 0.3 }} />
          <Area type="monotone" dataKey="v" name={name} stroke={color} strokeWidth={2} fill={`url(#${id})`} dot={false} activeDot={{ r: 4, stroke: '#fff', strokeWidth: 2, fill: color }} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Тўғри (бутун) y-ўқ белгилари: 0 … 4*step */
export function niceTicks(max: number) {
  const step = Math.max(1, Math.ceil(max / 4));
  return { step, ticks: [0, 1, 2, 3, 4].map((i) => i * step) };
}

/** Катта майдонли график: 12 ой, битта қатор. `table` — аниқ қийматлар жадвали (скринридер ва аниқлик учун) */
export function OverviewChart({ data, name, color, unit, table }: { data: { label: string; year: number; v: number }[]; name: string; color: string; unit?: string; table?: boolean }) {
  const id = useId().replace(/:/g, '');
  const max = Math.max(1, ...data.map((d) => d.v));
  const { ticks } = niceTicks(max);
  return (
    <div className="relative flex min-h-[300px] flex-1 flex-col">
      {table ? (
        <div className="mt-4 overflow-auto"><table className="w-full text-sm">
          <caption className="sr-only">{name}: ойлар бўйича</caption>
          <thead><tr><th className="th">Ой</th><th className="th text-right">{name}</th></tr></thead>
          <tbody className="divide-y divide-slate-100">{data.map((d) => <tr key={d.label + d.year}><td className="td py-2">{d.label} {d.year}</td><td className="td py-2 text-right font-medium tnum">{d.v}{unit}</td></tr>)}</tbody>
        </table></div>
      ) : (
        <div className="relative mt-4 flex-1" role="img" aria-label={`${name}: охирги ${data.length} ой. Энг юқори қиймат ${max}${unit ?? ''}. Аниқ қийматлар учун «Жадвал» тугмасини босинг.`}>
          <div className="absolute inset-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 12, right: 22, bottom: 0, left: -8 }}>
                <defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity={0.2} /><stop offset="100%" stopColor={color} stopOpacity={0.02} /></linearGradient></defs>
                <CartesianGrid vertical={false} stroke="#e5e5e5" strokeDasharray="3 4" />
                <XAxis dataKey="label" tick={axisTick} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={14} dy={6} />
                <YAxis tick={axisTick} tickLine={false} axisLine={false} allowDecimals={false} domain={[0, ticks[4]]} ticks={ticks} width={44} tickFormatter={(v) => `${v}${unit ?? ''}`} />
                <Tooltip content={<ChartTooltip unit={unit} />} cursor={{ stroke: '#a3a3a3', strokeDasharray: '3 3' }} labelFormatter={(l, p) => `${l} ${p?.[0]?.payload?.year ?? ''}`} />
                <Area type="monotone" dataKey="v" name={name} stroke={color} strokeWidth={2} fill={`url(#${id})`} dot={false} activeDot={{ r: 5, stroke: '#fff', strokeWidth: 2, fill: color }} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}

export interface Slice { name: string; value: number; color: string }

/** Донат + ўнгда легенда (ранг + аниқ ном + фоиз + сон — ранг якка ўзи маъно бермайди) */
export function Donut({ slices, centerValue, centerLabel }: { slices: Slice[]; centerValue: number; centerLabel: string }) {
  const total = slices.reduce((s, x) => s + x.value, 0);
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-4 sm:flex-nowrap">
      <div className="relative h-[140px] w-[140px] shrink-0" role="img" aria-label={`${centerLabel}: ${slices.map((s) => `${s.name} ${s.value}`).join(', ')}`}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip content={<ChartTooltip />} />
            <Pie data={slices} dataKey="value" nameKey="name" innerRadius={44} outerRadius={68} paddingAngle={slices.length > 1 ? 2 : 0} stroke="#fff" strokeWidth={2} startAngle={90} endAngle={-270} isAnimationActive={false}>
              {slices.map((s) => <Cell key={s.name} fill={s.color} />)}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-bold tracking-[-0.025em] tnum">{centerValue}</span>
          <span className="text-[11px] text-slate-500">{centerLabel}</span>
        </div>
      </div>
      <ul className="min-w-[12rem] flex-1 space-y-2.5 text-sm">
        {slices.map((s) => (
          <li key={s.name} className="flex items-start gap-2.5">
            <span className="mt-[3px] h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: s.color }} aria-hidden />
            <span className="min-w-0 flex-1 break-words leading-4 text-slate-600">{s.name}</span>
            <span className="shrink-0 whitespace-nowrap text-xs text-slate-400 tnum">{s.value}</span>
            <span className="w-10 shrink-0 whitespace-nowrap text-right font-semibold tnum">{total ? Math.round((s.value / total) * 100) : 0}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
