import { useQuery } from '@tanstack/react-query';
import { Briefcase, Palmtree, UserCheck, Users } from 'lucide-react';
import { Progress } from '../components/ui';
import { api } from '../lib/api';

export default function Dashboard() {
  const { data, isLoading, error } = useQuery({ queryKey: ['stats'], queryFn: () => api('/dashboard/stats') });
  if (isLoading) return <p className="text-slate-500">Yuklanmoqda…</p>;
  if (error) return <p className="text-brand">{(error as Error).message}</p>;

  const cards = [
    { label: 'Umumiy shtat', value: data.totalStaff, icon: Briefcase },
    { label: 'Band shtatlar', value: data.occupiedStaff, icon: UserCheck },
    { label: 'Bo\'sh shtatlar', value: data.vacantStaff, icon: Users },
    { label: "Ta'tildagilar", value: data.onLeave, icon: Palmtree },
  ];
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-navy">Bosh sahifa</h1>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map(({ label, value, icon: Icon }) => (
          <div key={label} className="card flex items-center gap-4 p-5">
            <div className="rounded-lg bg-navy/5 p-3 text-navy"><Icon size={22} /></div>
            <div><p className="text-2xl font-semibold">{value}</p><p className="text-xs text-slate-500">{label}</p></div>
          </div>
        ))}
      </div>
      <div className="card p-5">
        <h2 className="mb-4 font-semibold">Bo'limlar bo'yicha shtat bandligi</h2>
        <div className="space-y-4">
          {data.departments.map((d: any) => (
            <div key={d.id}>
              <div className="mb-1 flex justify-between text-sm"><span>{d.name}</span><span className="text-slate-500">{d.occupied} / {d.staff}</span></div>
              <Progress value={d.occupied} max={d.staff} />
            </div>
          ))}
          {data.departments.length === 0 && <p className="text-sm text-slate-500">Bo'limlar yo'q</p>}
        </div>
      </div>
    </div>
  );
}
