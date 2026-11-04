import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { RotateCcw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../components/ui';
import { api, fmtDate, fullName } from '../lib/api';
import { Button } from '../components/kit';

export default function Archive() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['employees', 'archived'], queryFn: () => api<any>('/employees?archived=true&pageSize=200') });
  const restore = useMutation({
    mutationFn: (id: string) => api(`/employees/${id}`, { method: 'PATCH', body: JSON.stringify({ status: 'ishlamoqda' }) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['employees'] }); qc.invalidateQueries({ queryKey: ['stats'] }); },
  });
  return (
    <div className="space-y-4">
      <PageHeader eyebrow="Кадрлар" title="Архив" hint="Ишдан бўшаган ходимлар. Ходим ҳолатини «Ишдан бўшаган» қилиб қўйсангиз, у шу ерга ўтади." />
      <div className="card overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-slate-200"><tr><th className="th">Табель</th><th className="th">Ф.И.Ш.</th><th className="th">Лавозим</th><th className="th">Бўлим</th><th className="th">Ишга қабул</th><th /></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {q.data?.items.map((e: any) => (
              <tr key={e.id} className="hover:bg-slate-50">
                <td className="td font-mono">{e.tabNumber}</td>
                <td className="td"><Link className="font-medium text-navy hover:text-brand" to={`/employees/${e.id}`}>{fullName(e)}</Link></td>
                <td className="td">{e.position.title}</td><td className="td text-slate-500">{e.department.name}</td><td className="td">{fmtDate(e.hireDate)}</td>
                <td className="td text-right"><Button variant="secondary" size="sm"  onClick={() => restore.mutate(e.id)}><RotateCcw size={14} /> Қайтариш</Button></td>
              </tr>
            ))}
            {q.data?.items.length === 0 && <tr><td colSpan={6} className="td py-10 text-center text-slate-500">Архив бўш</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
