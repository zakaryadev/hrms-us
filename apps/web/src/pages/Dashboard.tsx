import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Empty, ErrorNote, Loading, PageHeader, Progress } from '../components/ui';
import { api } from '../lib/api';

const today = new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });

export default function Dashboard() {
  const { data, isLoading, error } = useQuery({ queryKey: ['stats'], queryFn: () => api('/dashboard/stats') });
  if (isLoading) return <Loading />;
  if (error) return <ErrorNote error={error} />;

  const pct = data.totalStaff > 0 ? Math.round((data.occupiedStaff / data.totalStaff) * 100) : 0;
  const metrics = [
    { label: 'Умумий штат', value: data.totalStaff, note: 'штат бирликлари' },
    { label: 'Банд штатлар', value: data.occupiedStaff, note: `штатнинг ${pct}%` },
    { label: 'Бўш штатлар', value: data.vacantStaff, note: data.vacantStaff > 0 ? 'тўлдириш мумкин' : 'бўш жой йўқ' },
    { label: 'Таътилдагилар', value: data.onLeave, note: `жами ${data.totalEmployees} ходимдан` },
  ];
  return (
    <div>
      <PageHeader eyebrow={today} title="Бош саҳифа" hint="Штат ва ходимлар бўйича жорий ҳолат" />

      <section className="card grid grid-cols-2 lg:grid-cols-4" aria-label="Асосий кўрсаткичлар">
        {metrics.map((m, i) => (
          <div key={m.label} className={`px-6 py-5 ${i % 2 === 1 ? 'border-l border-slate-200' : ''} ${i > 0 ? 'lg:border-l lg:border-slate-200' : ''} ${i >= 2 ? 'border-t border-slate-200 lg:border-t-0' : ''}`}>
            <p className="eyebrow">{m.label}</p>
            <p className="mt-2 text-[38px] font-semibold leading-none tracking-tight text-navy tnum">{m.value}</p>
            <p className="mt-2 text-xs text-slate-500">{m.note}</p>
          </div>
        ))}
      </section>

      <section className="mt-8">
        <div className="mb-3 flex items-end justify-between">
          <h2 className="text-base font-semibold tracking-tight text-navy">Бўлимлар бўйича штат бандлиги</h2>
          <Link to="/structure" className="text-[13px] font-medium text-brand hover:underline">Штат ва сон →</Link>
        </div>
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[560px]">
            <thead className="border-b border-slate-200"><tr>
              <th className="th">Бўлим</th><th className="th text-right">Штат</th><th className="th text-right">Банд</th><th className="th text-right">Бўш</th><th className="th w-[34%]">Бандлик</th>
            </tr></thead>
            <tbody className="divide-y divide-slate-100">
              {data.departments.map((d: any) => {
                const free = d.staff - d.occupied;
                const p = d.staff > 0 ? Math.round((d.occupied / d.staff) * 100) : 0;
                return (
                  <tr key={d.id}>
                    <td className="td font-medium text-slate-900">{d.name}</td>
                    <td className="td text-right text-slate-600">{d.staff}</td>
                    <td className="td text-right text-slate-900">{d.occupied}</td>
                    <td className={`td text-right ${free < 0 ? 'font-medium text-amber-600' : 'text-slate-600'}`}>{free}</td>
                    <td className="td"><div className="flex items-center gap-3"><div className="flex-1"><Progress value={d.occupied} max={d.staff} /></div><span className="w-10 text-right text-xs text-slate-500 tnum">{d.staff > 0 ? `${p}%` : '—'}</span></div></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {data.departments.length === 0 && <Empty>Бўлимлар йўқ</Empty>}
        </div>
      </section>
    </div>
  );
}
