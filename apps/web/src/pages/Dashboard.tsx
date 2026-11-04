import { useQuery } from '@tanstack/react-query';
import { ArrowUpRight, FileText, LineChart as LineIcon, List, Palmtree, PieChart as PieIcon, ScrollText, TrendingDown, TrendingUp, UserCheck, UserPlus, Users, UserSquare2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { CATEGORICAL, CHART, Donut, OverviewChart, Spark, type Slice } from '../components/dashboard/charts';
import { Avatar, Tabs } from '../components/kit';
import { Empty, ErrorNote, Loading, PageHeader, Progress } from '../components/ui';
import { api, fmtDate, photoSrc } from '../lib/api';

const timeAgo = (iso: string) => {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'ҳозир';
  if (s < 3600) return `${Math.floor(s / 60)} дақиқа олдин`;
  if (s < 86400) return `${Math.floor(s / 3600)} соат олдин`;
  if (s < 86400 * 7) return `${Math.floor(s / 86400)} кун олдин`;
  return fmtDate(iso);
};

/** Ўзгариш белгиси: good — яхшиланиш (яшил), bad — ёмонлашиш (қизил), neutral — кулранг */
function Delta({ value, goodWhen = 'up', unit = '', caption }: { value: number; goodWhen?: 'up' | 'down' | 'none'; unit?: string; caption: string }) {
  const up = value > 0, down = value < 0;
  const good = goodWhen === 'none' ? null : value === 0 ? null : (goodWhen === 'up') === up;
  const color = good === null ? 'text-slate-500' : good ? 'text-emerald-600' : 'text-red-600';
  const Icon = up ? TrendingUp : down ? TrendingDown : null;
  return (
    <p className="mt-2 flex items-center gap-1.5 text-xs">
      <span className={`flex items-center gap-1 font-semibold tnum ${color}`}>{Icon && <Icon size={14} aria-hidden />}{value > 0 ? '+' : value < 0 ? '−' : ''}{Math.abs(value)}{unit}</span>
      <span className="text-slate-500">{caption}</span>
    </p>
  );
}

function Kpi({ label, value, icon: Icon, color, children, spark }: { label: string; value: string | number; icon: typeof Users; color: string; children: React.ReactNode; spark: React.ReactNode }) {
  return (
    <div className="card flex flex-col overflow-hidden">
      <div className="flex items-start justify-between gap-3 p-5 pb-0">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-bold leading-8 tracking-[-0.025em] tnum">{value}</p>
        </div>
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[10px]" style={{ background: `${color}1a`, color }} aria-hidden><Icon size={20} strokeWidth={1.8} /></span>
      </div>
      <div className="px-5">{children}</div>
      <div className="mt-auto pt-2">{spark}</div>
    </div>
  );
}

const ORDER_BADGE: Record<string, string> = {
  tatil_berish: 'bg-emerald-600 text-white', lavozim_otkazish: 'bg-slate-900 text-white', ishga_qabul: 'bg-sky-700 text-white', ishdan_boshatish: 'bg-red-600 text-white', ragbatlantirish: 'bg-amber-400 text-slate-950',
};
const ACTIVITY_ICON: Record<string, { icon: typeof Users; color: string }> = {
  employee: { icon: UserPlus, color: CHART.c2 }, order: { icon: ScrollText, color: CHART.c1 }, document: { icon: FileText, color: CHART.c4 },
};

type Metric = 'headcount' | 'hires' | 'leaves';
const METRICS: { value: Metric; label: string; name: string; color: string }[] = [
  { value: 'headcount', label: 'Ходимлар', name: 'Ходимлар сони', color: CHART.c1 },
  { value: 'hires', label: 'Қабул', name: 'Қабул қилинганлар', color: CHART.c2 },
  { value: 'leaves', label: 'Таътил', name: 'Бошланган таътиллар', color: CHART.c3 },
];

export default function Dashboard() {
  const { user } = useAuth();
  const { data, isLoading, error } = useQuery({ queryKey: ['stats'], queryFn: () => api('/dashboard/stats') });
  const [metric, setMetric] = useState<Metric>('headcount');
  const [table, setTable] = useState(false);
  const sp = (k: string) => (data?.months ?? []).map((m: any, i: number) => ({ label: m.label, year: m.year, v: data.series[k][i] }));

  const slices: Slice[] = useMemo(() => {
    const d: { name: string; count: number }[] = data?.distribution ?? [];
    const top = d.slice(0, 4).map((x, i): Slice => ({ name: x.name, value: x.count, color: CATEGORICAL[i] }));
    const rest = d.slice(4).reduce((s, x) => s + x.count, 0);
    return rest > 0 ? [...top, { name: 'Бошқа бўлимлар', value: rest, color: CHART.other }] : top;
  }, [data]);

  if (isLoading) return <Loading rows={6} />;
  if (error) return <ErrorNote error={error} />;

  const pct = data.totalStaff > 0 ? Math.round((data.occupiedStaff / data.totalStaff) * 100) : 0;
  const m = METRICS.find((x) => x.value === metric)!;
  const goals = [...data.departments].filter((d: any) => d.staff > 0).sort((a: any, b: any) => b.staff - a.staff).slice(0, 3);
  const leavesThisMonth = data.series.leaves[11];

  return (
    <div>
      <PageHeader title="Бош саҳифа" hint={`Хуш келибсиз, ${user?.fullName ?? ''}. Кадрлар бўлимидаги бугунги ҳолат.`} />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Асосий кўрсаткичлар">
        <Kpi label="Ходимлар" value={data.totalEmployees} icon={Users} color={CHART.c1}
          spark={<Spark data={sp('headcount')} color={CHART.c1} name="Ходимлар сони" />}>
          <Delta value={data.deltas.headcount} caption="ўтган ой охирига нисбатан" />
        </Kpi>
        <Kpi label="Штат бандлиги" value={`${pct}%`} icon={UserCheck} color={CHART.c2}
          spark={<Spark data={sp('occupancy')} color={CHART.c2} name="Штат бандлиги" unit="%" />}>
          <Delta value={data.deltas.occupancy} unit=" п.п." caption={`${data.occupiedStaff} / ${data.totalStaff} штат`} />
        </Kpi>
        <Kpi label="Таътилда" value={data.onLeave} icon={Palmtree} color={CHART.c3}
          spark={<Spark data={sp('leaves')} color={CHART.c3} name="Бошланган таътиллар" />}>
          <Delta value={leavesThisMonth} goodWhen="none" caption="шу ой бошланган таътил" />
        </Kpi>
        <Kpi label="Бўш штатлар" value={data.vacantStaff} icon={UserSquare2} color={CHART.c4}
          spark={<Spark data={sp('vacant')} color={CHART.c4} name="Бўш штатлар" />}>
          <Delta value={data.deltas.vacant} goodWhen="down" caption="ўтган ой охирига нисбатан" />
        </Kpi>
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-3">
        <div className="card flex min-w-0 flex-col p-6 xl:col-span-2">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold tracking-[-0.025em]">Умумий кўриниш</h2>
              <p className="mt-1 text-xs text-slate-500">Охирги 12 ой (ҳозир ишлаётганлар қабул санаси бўйича)</p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Tabs aria-label="Кўрсаткич" items={METRICS.map((x) => ({ value: x.value, label: x.label }))} value={metric} onChange={setMetric} />
              <button type="button" onClick={() => setTable((t) => !t)} aria-pressed={table} title={table ? 'Графикни кўрсатиш' : 'Жадвал кўриниши'} aria-label={table ? 'Графикни кўрсатиш' : 'Жадвал кўриниши'}
                className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-950 aria-pressed:bg-slate-100">
                {table ? <LineIcon size={16} /> : <List size={16} />}
              </button>
            </div>
          </div>
          <OverviewChart data={sp(metric)} name={m.name} color={m.color} table={table} />
        </div>

        <div className="flex flex-col gap-4">
          <div className="card p-6">
            <h2 className="text-base font-semibold tracking-[-0.025em]">Бўлимлар бўйича ходимлар</h2>
            <p className="mb-5 mt-1 text-xs text-slate-500">Ишлаётган ходимларнинг бўлимлар бўйича тақсимоти</p>
            {slices.length ? <Donut slices={slices} centerValue={data.totalEmployees} centerLabel="ходим" /> : <Empty><PieIcon className="mx-auto mb-2 text-slate-300" />Маълумот йўқ</Empty>}
          </div>

          <div className="card flex-1 p-6">
            <div className="flex items-start justify-between">
              <div><h2 className="text-base font-semibold tracking-[-0.025em]">Штат бандлиги</h2><p className="mb-5 mt-1 text-xs text-slate-500">Энг катта бўлимлар бўйича</p></div>
              <Link to="/structure" className="flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-950">Барчаси <ArrowUpRight size={13} /></Link>
            </div>
            <div className="space-y-5">
              {goals.map((d: any, i: number) => {
                const p = Math.round((d.occupied / d.staff) * 100);
                return (
                  <div key={d.id}>
                    <div className="mb-2 flex items-center justify-between gap-3 text-sm"><span className="truncate font-medium" title={d.name}>{d.name}</span><span className="text-xs text-slate-500 tnum">{p}%</span></div>
                    <Progress value={d.occupied} max={d.staff} color={CATEGORICAL[i]} label={d.name} />
                    <div className="mt-1.5 flex justify-between text-xs text-slate-500 tnum"><span>Банд: {d.occupied}</span><span>Штат: {d.staff}</span></div>
                  </div>
                );
              })}
              {goals.length === 0 && <Empty>Штат белгиланмаган</Empty>}
            </div>
          </div>
        </div>
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-3">
        <div className="card min-w-0 p-6 xl:col-span-2">
          <div className="mb-4 flex items-start justify-between">
            <div><h2 className="text-base font-semibold tracking-[-0.025em]">Сўнгги буйруқлар</h2><p className="mt-1 text-xs text-slate-500">Яқинда яратилган кадрлар буйруқлари</p></div>
            <Link to="/orders" className="flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-950">Барчаси <ArrowUpRight size={13} /></Link>
          </div>
          <div className="-mx-4 overflow-x-auto">
            <table className="w-full min-w-[520px]">
              <thead className="border-b border-slate-200"><tr><th className="th">Ходим</th><th className="th">№</th><th className="th">Тури</th><th className="th text-right">Сана</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {data.recentOrders.map((o: any) => (
                  <tr key={o.id} className="transition-colors hover:bg-slate-50">
                    <td className="td"><Link to={`/employees/${o.employee.id}`} className="flex items-center gap-3"><Avatar size={36} src={photoSrc(o.employee.photoUrl)} name={o.employee.fullName} /><span className="min-w-0"><span className="block truncate text-sm font-medium">{o.employee.fullName}</span><span className="block text-xs text-slate-500">Табель № {o.employee.tabNumber}</span></span></Link></td>
                    <td className="td font-mono text-xs text-slate-500">{o.orderNumber}</td>
                    <td className="td"><span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${ORDER_BADGE[o.orderType] ?? 'bg-slate-200 text-slate-800'}`}>{o.typeLabel}</span></td>
                    <td className="td text-right text-slate-600 tnum">{fmtDate(o.orderDate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {data.recentOrders.length === 0 && <Empty>Ҳали буйруқ яратилмаган</Empty>}
          </div>
        </div>

        <div className="card min-w-0 p-6">
          <h2 className="text-base font-semibold tracking-[-0.025em]">Сўнгги ҳаракатлар</h2>
          <p className="mb-5 mt-1 text-xs text-slate-500">Тизимдаги охирги ўзгаришлар</p>
          <ul className="space-y-5">
            {data.activity.map((a: any, i: number) => {
              const { icon: Icon, color } = ACTIVITY_ICON[a.kind] ?? ACTIVITY_ICON.order;
              return (
                <li key={i} className="flex items-start gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[10px]" style={{ background: `${color}1a`, color }} aria-hidden><Icon size={18} strokeWidth={1.8} /></span>
                  <div className="min-w-0"><p className="text-sm font-medium leading-5">{a.title}</p><p className="truncate text-xs text-slate-500" title={a.text}>{a.text}</p><p className="mt-0.5 text-xs text-slate-400">{timeAgo(a.at)}</p></div>
                </li>
              );
            })}
            {data.activity.length === 0 && <Empty>Ҳали ҳаракат йўқ</Empty>}
          </ul>
        </div>
      </section>
    </div>
  );
}
