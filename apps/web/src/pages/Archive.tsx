import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { RotateCcw, User } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCan } from '../auth/AuthContext';
import DataTable, { actionBtn, iconBtn, type Column } from '../components/DataTable';
import { PageHeader } from '../components/ui';
import { api, fmtDate, fullName } from '../lib/api';

export default function Archive() {
  const can = useCan();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['employees', 'archived'], queryFn: () => api<any>('/employees?archived=true&pageSize=200') });
  const restore = useMutation({
    mutationFn: (id: string) => api(`/employees/${id}`, { method: 'PATCH', body: JSON.stringify({ status: 'ishlamoqda' }) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['employees'] }); qc.invalidateQueries({ queryKey: ['stats'] }); },
  });
  const columns: Column<any>[] = [
    { key: 'tab', header: 'Табель', value: (e) => e.tabNumber, cell: (e) => <span className="font-mono">{e.tabNumber}</span>, nowrap: true },
    { key: 'fio', header: 'Ф.И.Ш.', locked: true, minWidth: '12rem', value: (e) => fullName(e), cell: (e) => <Link className="font-medium text-slate-950 hover:underline" to={`/employees/${e.id}`}>{fullName(e)}</Link> },
    { key: 'position', header: 'Лавозим', minWidth: '10rem', value: (e) => e.position.title },
    { key: 'department', header: 'Бўлим', minWidth: '10rem', className: 'text-slate-500', value: (e) => e.department.name },
    { key: 'hireDate', header: 'Ишга қабул', nowrap: true, value: (e) => e.hireDate, cell: (e) => fmtDate(e.hireDate) },
    { key: 'phone', header: 'Телефон', hidden: true, nowrap: true, value: (e) => e.phone },
  ];
  return (
    <div className="space-y-4">
      <PageHeader title="Архив" hint="Ишдан бўшаган ходимлар. Ходим ҳолатини «Ишдан бўшаган» қилиб қўйсангиз, у шу ерга ўтади." />
      <DataTable
        storageKey="archive" columns={columns} rows={q.data?.items} rowKey={(e) => e.id} loading={q.isLoading}
        searchPlaceholder="Ф.И.Ш., табель, лавозим бўйича қидириш" emptyText="Архив бўш"
        actions={(e) => (
          <>
            <Link to={`/employees/${e.id}`} className={iconBtn} title="Профилни очиш" aria-label="Профилни очиш"><User size={16} /></Link>
            {can.write && <button type="button" className={actionBtn} disabled={restore.isPending} onClick={() => confirm(`«${fullName(e)}» ишлаётганлар рўйхатига қайтарилсинми?`) && restore.mutate(e.id)}><RotateCcw size={14} /> Қайтариш</button>}
          </>
        )}
      />
    </div>
  );
}
