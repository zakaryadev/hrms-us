import { useQuery } from '@tanstack/react-query';
import { Download } from 'lucide-react';
import { useState } from 'react';
import EmployeePicker from '../components/EmployeePicker';
import { LeaveModal } from '../components/GenerateDocs';
import { api, fmtDate, fullName } from '../lib/api';

export default function Leaves() {
  const [emp, setEmp] = useState<any>(null);
  const q = useQuery({ queryKey: ['orders', 'tatil_berish'], queryFn: () => api<any[]>('/orders?type=tatil_berish') });
  const today = new Date().toISOString().slice(0, 10);
  const state = (o: any) => {
    const s = o.payloadJson?.startDate, e = o.payloadJson?.calculated?.endDate;
    return s && e && today >= s && today <= e ? 'on' : s && today < s ? 'soon' : 'done';
  };
  const badge = { on: ['Таътилда', 'bg-amber-50 text-amber-700'], soon: ['Режалаштирилган', 'bg-sky-50 text-sky-700'], done: ['Тугаган', 'bg-surface text-ink-500'] } as const;
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-ink">Таътиллар</h1>
      <div className="card flex flex-wrap items-center gap-3 p-4">
        <span className="text-sm text-ink-500">Таътил буйруғи яратиш:</span>
        <EmployeePicker onPick={setEmp} />
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-surface-line bg-surface"><tr><th className="th">Ходим</th><th className="th">Бошланиши</th><th className="th">Тугаши</th><th className="th">Ишга чиқиш</th><th className="th">Кун</th><th className="th">Ҳолат</th><th /></tr></thead>
          <tbody className="divide-y divide-surface-line">
            {q.data?.map((o) => {
              const p = o.payloadJson ?? {}, st = state(o), [label, cls] = badge[st];
              return (
                <tr key={o.id} className="hover:bg-brand-50">
                  <td className="td font-medium">{fullName(o.employee)}</td><td className="td">{fmtDate(p.startDate)}</td>
                  <td className="td">{fmtDate(p.calculated?.endDate)}</td><td className="td">{fmtDate(p.calculated?.returnDate)}</td>
                  <td className="td">{p.calculated?.totalDays ?? '—'}</td><td className="td"><span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}>{label}</span></td>
                  <td className="td text-right">{o.hasFile && <a className="btn-secondary !px-3 !py-1.5" href={`/api/orders/${o.id}/download`}><Download size={14} /> DOCX</a>}</td>
                </tr>
              );
            })}
            {q.data?.length === 0 && <tr><td colSpan={7} className="td py-10 text-center text-ink-500">Таътил буйруқлари йўқ</td></tr>}
          </tbody>
        </table>
      </div>
      {emp && <LeaveModal employee={emp} onClose={() => setEmp(null)} />}
    </div>
  );
}
