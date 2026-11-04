import { useQuery } from '@tanstack/react-query';
import { Briefcase, Palmtree, UserCheck, Users } from 'lucide-react';
import { ErrorNote, Loading, PageHeader, Progress } from '../components/ui';
import { api } from '../lib/api';

export default function Dashboard() {
  const { data, isLoading, error } = useQuery({ queryKey: ['stats'], queryFn: () => api('/dashboard/stats') });
  if (isLoading) return <Loading />;
  if (error) return <ErrorNote error={error} />;

  const cards = [
    { label: 'Умумий штат', value: data.totalStaff, icon: Briefcase },
    { label: 'Банд штатлар', value: data.occupiedStaff, icon: UserCheck },
    { label: 'Бўш штатлар', value: data.vacantStaff, icon: Users },
    { label: 'Таътилдагилар', value: data.onLeave, icon: Palmtree },
  ];
  return (
    <div className="space-y-6">
      <PageHeader title="Бош саҳифа" hint="Штат ва ходимлар бўйича умумий кўрсаткичлар" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map(({ label, value, icon: Icon }) => (
          <div key={label} className="card flex items-center gap-3 p-4 sm:gap-4 sm:p-5">
            <div className="shrink-0 rounded-lg bg-brand-soft p-3 text-brand"><Icon size={22} /></div>
            <div className="min-w-0"><p className="text-2xl font-semibold">{value}</p><p className="break-words text-xs text-slate-500">{label}</p></div>
          </div>
        ))}
      </div>
      <div className="card p-5">
        <h2 className="mb-4 font-semibold">Бўлимлар бўйича штат бандлиги</h2>
        <div className="space-y-4">
          {data.departments.map((d: any) => (
            <div key={d.id}>
              <div className="mb-1 flex justify-between text-sm"><span>{d.name}</span><span className="text-slate-500">{d.occupied} / {d.staff}</span></div>
              <Progress value={d.occupied} max={d.staff} />
            </div>
          ))}
          {data.departments.length === 0 && <p className="text-sm text-slate-500">Бўлимлар йўқ</p>}
        </div>
      </div>
    </div>
  );
}
