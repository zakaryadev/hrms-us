import DeleteDocButton from '../components/DeleteDocButton';
import { useQuery } from '@tanstack/react-query';
import { Download } from 'lucide-react';
import { useState } from 'react';
import EmployeePicker from '../components/EmployeePicker';
import { DocModal } from '../components/GenerateDocs';
import { PageHeader } from '../components/ui';
import { api, fmtDate, fullName } from '../lib/api';
import { buttonStyles, cn } from '../components/kit';
import { useCan } from '../auth/AuthContext';

export default function Certificates() {
  const can = useCan();
  const [emp, setEmp] = useState<any>(null);
  const q = useQuery({ queryKey: ['generated', 'obyektivka'], queryFn: () => api<any[]>('/documents/generated?type=obyektivka') });
  return (
    <div className="space-y-4">
      <PageHeader title="Маълумотнома" hint="Ходимлар учун яратилган Т-2 маълумотномалар" />
      {can.write && <div className="card flex flex-wrap items-center gap-3 p-4">
        <span className="text-sm text-slate-600">Янги маълумотнома (Т-2):</span>
        <EmployeePicker onPick={setEmp} />
      </div>}
      <div className="card overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-slate-200"><tr><th className="th">Сана</th><th className="th">Ходим</th><th className="th">Табель</th><th /></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {q.data?.map((g) => (
              <tr key={g.id} className="hover:bg-slate-50"><td className="td whitespace-nowrap">{fmtDate(g.createdAt)}</td><td className="td font-medium">{fullName(g.employee)}</td><td className="td font-mono">{g.employee.tabNumber}</td>
                <td className="td text-right"><div className="flex items-center justify-end gap-1"><a className={cn(buttonStyles({ variant: 'secondary', size: 'sm' }))} href={`/api/documents/generated/${g.id}/download`}><Download size={14} /> DOCX</a><DeleteDocButton id={g.id} label="Маълумотнома" /></div></td></tr>
            ))}
            {q.data?.length === 0 && <tr><td colSpan={4} className="td py-10 text-center text-slate-500">Ҳали маълумотнома яратилмаган</td></tr>}
          </tbody>
        </table>
      </div>
      {emp && <DocModal type="obyektivka" employee={emp} onClose={() => setEmp(null)} />}
    </div>
  );
}
