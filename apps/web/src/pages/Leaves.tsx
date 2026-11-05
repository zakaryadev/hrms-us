import { useQuery } from '@tanstack/react-query';
import { Download, User } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import DataTable, { actionBtn, iconBtn, type Column } from '../components/DataTable';
import EmployeePicker from '../components/EmployeePicker';
import { LeaveModal } from '../components/GenerateDocs';
import { PageHeader } from '../components/ui';
import { api, fmtDate, fullName } from '../lib/api';

const BADGE = { on: ['Таътилда', 'bg-amber-50 text-amber-700'], soon: ['Режалаштирилган', 'bg-blue-50 text-blue-700'], done: ['Тугаган', 'bg-slate-100 text-slate-600'] } as const;

export default function Leaves() {
  const [emp, setEmp] = useState<any>(null);
  const q = useQuery({ queryKey: ['orders', 'tatil_berish'], queryFn: () => api<any[]>('/orders?type=tatil_berish') });
  const today = new Date().toISOString().slice(0, 10);
  const state = (o: any): keyof typeof BADGE => {
    const s = o.payloadJson?.startDate, e = o.payloadJson?.calculated?.endDate;
    return s && e && today >= s && today <= e ? 'on' : s && today < s ? 'soon' : 'done';
  };
  const columns: Column<any>[] = [
    { key: 'employee', header: 'Ходим', locked: true, minWidth: '12rem', value: (o) => fullName(o.employee), cell: (o) => <span className="font-medium">{fullName(o.employee)}</span> },
    { key: 'start', header: 'Бошланиши', nowrap: true, value: (o) => o.payloadJson?.startDate, cell: (o) => fmtDate(o.payloadJson?.startDate) },
    { key: 'end', header: 'Тугаши', nowrap: true, value: (o) => o.payloadJson?.calculated?.endDate, cell: (o) => fmtDate(o.payloadJson?.calculated?.endDate) },
    { key: 'ret', header: 'Ишга чиқиш', nowrap: true, value: (o) => o.payloadJson?.calculated?.returnDate, cell: (o) => fmtDate(o.payloadJson?.calculated?.returnDate) },
    { key: 'days', header: 'Кун', value: (o) => o.payloadJson?.calculated?.totalDays, cell: (o) => o.payloadJson?.calculated?.totalDays ?? '—' },
    { key: 'state', header: 'Ҳолат', value: (o) => BADGE[state(o)][0], cell: (o) => { const [label, cls] = BADGE[state(o)]; return <span className={`whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}>{label}</span>; } },
    { key: 'number', header: 'Буйруқ №', hidden: true, nowrap: true, value: (o) => o.orderNumber },
  ];
  return (
    <div className="space-y-4">
      <PageHeader title="Таътиллар" hint="Меҳнат таътили буйруқлари ва ходимларнинг таътил ҳолати" />
      <div className="card flex flex-wrap items-center gap-3 p-4">
        <span className="text-sm text-slate-600">Таътил буйруғи яратиш:</span>
        <EmployeePicker onPick={setEmp} />
      </div>
      <DataTable
        storageKey="leaves" columns={columns} rows={q.data} rowKey={(o) => o.id} loading={q.isLoading} defaultSort={{ key: 'start', dir: 'desc' }}
        searchPlaceholder="Ходим ёки ҳолат бўйича қидириш" emptyText="Таътил буйруқлари йўқ"
        actions={(o) => (
          <>
            {o.hasFile && <a className={actionBtn} href={`/api/orders/${o.id}/download`}><Download size={14} /> DOCX</a>}
            <Link to={`/employees/${o.employee.id}`} className={iconBtn} title="Ходим профили" aria-label="Ходим профили"><User size={16} /></Link>
          </>
        )}
      />
      {emp && <LeaveModal employee={emp} onClose={() => setEmp(null)} />}
    </div>
  );
}
