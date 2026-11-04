import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { api, EMP_TYPE_LABEL, fmtMoney } from '../lib/api';

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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-ink">Иш ҳақи</h1>
        <div className="flex items-center rounded-lg border border-surface-line bg-white">
          <button className="px-2 py-2 hover:bg-brand-50" onClick={() => shift(-1)} aria-label="Олдинги ой"><ChevronLeft size={16} /></button>
          <span className="min-w-[150px] text-center text-sm font-medium">{MONTHS[month - 1]} {year}</span>
          <button className="px-2 py-2 hover:bg-brand-50" onClick={() => shift(1)} aria-label="Кейинги ой"><ChevronRight size={16} /></button>
        </div>
      </div>
      <p className="text-sm text-ink-500">Табель асосида ҳисобланган ойлик. Табелни ўзгартирсангиз, бу ерда ҳам янгиланади.</p>
      <div className="card overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-surface-line bg-surface"><tr>
            <th className="th">Ходим</th><th className="th">Тури</th><th className="th text-right">Оклад</th><th className="th text-right">Иш куни</th>
            <th className="th text-right">КВ</th><th className="th text-right">СК</th><th className="th text-right">Ҳисобланган</th></tr></thead>
          <tbody className="divide-y divide-surface-line">
            {q.data?.rows.map((r: any) => (
              <tr key={r.employeeId} className="hover:bg-brand-50">
                <td className="td"><div className="font-medium">{r.fullName}</div><div className="text-xs text-ink-500">{r.tabNumber} · {r.position}</div></td>
                <td className="td text-ink-500">{EMP_TYPE_LABEL[r.employmentType]}</td><td className="td text-right">{fmtMoney(r.salary)}</td>
                <td className="td text-right">{r.result.workedDays} / {r.result.workingDays}</td><td className="td text-right">{r.result.sickDays}</td><td className="td text-right">{r.result.absentDays}</td>
                <td className="td text-right font-semibold text-ink">{fmtMoney(r.result.salary)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot><tr className="border-t bg-surface"><td className="td font-semibold" colSpan={6}>Жами</td><td className="td text-right font-bold text-ink">{fmtMoney(total)}</td></tr></tfoot>
        </table>
      </div>
    </div>
  );
}
