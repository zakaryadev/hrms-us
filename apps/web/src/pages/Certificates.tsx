import { useQuery } from '@tanstack/react-query';
import { Download, User } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCan } from '../auth/AuthContext';
import DataTable, { actionBtn, iconBtn, type Column } from '../components/DataTable';
import DeleteDocButton from '../components/DeleteDocButton';
import EmployeePicker from '../components/EmployeePicker';
import { DocModal } from '../components/GenerateDocs';
import { PageHeader } from '../components/ui';
import { api, fmtDate, fullName } from '../lib/api';

export default function Certificates() {
  const can = useCan();
  const [emp, setEmp] = useState<any>(null);
  const q = useQuery({ queryKey: ['generated', 'obyektivka'], queryFn: () => api<any[]>('/documents/generated?type=obyektivka') });
  const columns: Column<any>[] = [
    { key: 'createdAt', header: 'Сана', value: (g) => g.createdAt, cell: (g) => fmtDate(g.createdAt), nowrap: true },
    { key: 'employee', header: 'Ходим', locked: true, minWidth: '12rem', value: (g) => fullName(g.employee), cell: (g) => <span className="font-medium">{fullName(g.employee)}</span> },
    { key: 'tab', header: 'Табель', value: (g) => g.employee.tabNumber, cell: (g) => <span className="font-mono">{g.employee.tabNumber}</span>, nowrap: true },
  ];
  return (
    <div className="space-y-4">
      <PageHeader title="Маълумотнома" hint="Ходимлар учун яратилган Т-2 маълумотномалар" />
      {can.write && (
        <div className="card flex flex-wrap items-center gap-3 p-4">
          <span className="text-sm text-slate-600">Янги маълумотнома (Т-2):</span>
          <EmployeePicker onPick={setEmp} />
        </div>
      )}
      <DataTable
        storageKey="certificates" columns={columns} rows={q.data} rowKey={(g) => g.id} loading={q.isLoading} defaultSort={{ key: 'createdAt', dir: 'desc' }}
        searchPlaceholder="Ходим ёки табель бўйича қидириш" emptyText="Ҳали маълумотнома яратилмаган"
        actions={(g) => (
          <>
            <a className={actionBtn} href={`/api/documents/generated/${g.id}/download`}><Download size={14} /> DOCX</a>
            <Link to={`/employees/${g.employee.id}`} className={iconBtn} title="Ходим профили" aria-label="Ходим профили"><User size={16} /></Link>
            <DeleteDocButton id={g.id} label="Маълумотнома" />
          </>
        )}
      />
      {emp && <DocModal type="obyektivka" employee={emp} onClose={() => setEmp(null)} />}
    </div>
  );
}
