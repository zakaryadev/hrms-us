import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { PeriodSwitch } from '../components/PeriodSwitch';
import { api, EMP_TYPE_LABEL, fmtMoney } from '../lib/api';
import { PageHeader } from '../components/ui';

const MONTHS = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];

export default function Payroll() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const q = useQuery({ queryKey: ['timesheet', year, month, ''], queryFn: () => api<any>(`/timesheet?year=${year}&month=${month}`) });
  const shift = (d: number) => { const t = new Date(year, month - 1 + d, 1); setYear(t.getFullYear()); setMonth(t.getMonth() + 1); };
  const total = q.data?.rows.reduce((s: number, r: any) => s + r.result.salary, 0) ?? 0;
  return (
    <div className="space-y-4">
      <PageHeader title="Иш ҳақи" hint="Табель асосида ҳисобланган ойлик. Табелни ўзгартирсангиз, бу ерда ҳам янгиланади.">
        <PeriodSwitch label={`${MONTHS[month - 1]} ${year}`} onPrev={() => shift(-1)} onNext={() => shift(1)} prevLabel="Олдинги ой" nextLabel="Кейинги ой" />
      </PageHeader>
      <div className="card overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-slate-200"><tr>
            <th className="th">Ходим</th><th className="th">Тури</th><th className="th text-right">Оклад</th><th className="th text-right">Иш куни</th>
            <th className="th text-right">КВ</th><th className="th text-right">СК</th><th className="th text-right">Ҳисобланган</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {q.data?.rows.map((r: any) => (
              <tr key={r.employeeId} className="hover:bg-slate-50">
                <td className="td min-w-[12rem]"><div className="font-medium">{r.fullName}</div><div className="text-xs text-slate-500">{r.tabNumber} · {r.position}</div></td>
                <td className="td text-slate-500">{EMP_TYPE_LABEL[r.employmentType]}</td><td className="td text-right whitespace-nowrap">{fmtMoney(r.salary)}</td>
                <td className="td text-right">{r.result.workedDays} / {r.result.workingDays}</td><td className="td text-right">{r.result.sickDays}</td><td className="td text-right">{r.result.absentDays}</td>
                <td className="td text-right font-semibold text-navy whitespace-nowrap">{fmtMoney(r.result.salary)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot><tr className="border-t bg-slate-50"><td className="td font-semibold" colSpan={6}>Жами</td><td className="td text-right font-bold text-navy whitespace-nowrap">{fmtMoney(total)}</td></tr></tfoot>
        </table>
      </div>
    </div>
  );
}
