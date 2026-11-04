import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { RotateCcw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api, fmtDate, fullName } from '../lib/api';

export default function Archive() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['employees', 'archived'], queryFn: () => api<any>('/employees?archived=true&pageSize=200') });
  const restore = useMutation({
    mutationFn: (id: string) => api(`/employees/${id}`, { method: 'PATCH', body: JSON.stringify({ status: 'ishlamoqda' }) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['employees'] }); qc.invalidateQueries({ queryKey: ['stats'] }); },
  });
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-ink">Архив</h1>
      <p className="text-sm text-ink-500">Ишдан бўшаган ходимлар. Ходим ҳолатини «Ишдан бўшаган» қилиб қўйсангиз, у шу ерга ўтади.</p>
      <div className="card overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-surface-line bg-surface"><tr><th className="th">Табель</th><th className="th">Ф.И.Ш.</th><th className="th">Лавозим</th><th className="th">Бўлим</th><th className="th">Ишга қабул</th><th /></tr></thead>
          <tbody className="divide-y divide-surface-line">
            {q.data?.items.map((e: any) => (
              <tr key={e.id} className="hover:bg-brand-50">
                <td className="td font-mono">{e.tabNumber}</td>
                <td className="td"><Link className="font-medium text-ink hover:text-brand" to={`/employees/${e.id}`}>{fullName(e)}</Link></td>
                <td className="td">{e.position.title}</td><td className="td text-ink-500">{e.department.name}</td><td className="td">{fmtDate(e.hireDate)}</td>
                <td className="td text-right"><button className="btn-secondary !px-3 !py-1.5" onClick={() => restore.mutate(e.id)}><RotateCcw size={14} /> Қайтариш</button></td>
              </tr>
            ))}
            {q.data?.items.length === 0 && <tr><td colSpan={6} className="td py-10 text-center text-ink-500">Архив бўш</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
