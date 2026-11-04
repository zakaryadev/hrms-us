import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import EmployeeForm from '../components/EmployeeForm';
import { StatusBadge } from '../components/ui';
import { api, EMP_TYPE_LABEL, fullName } from '../lib/api';

export default function Employees() {
  const qc = useQueryClient();
  const [q, setQ] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const [importMsg, setImportMsg] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const pageSize = 15;

  const departments = useQuery({ queryKey: ['departments'], queryFn: () => api<any[]>('/departments') });
  const list = useQuery({
    queryKey: ['employees', q, departmentId, page],
    queryFn: () => api(`/employees?${new URLSearchParams({ archived: 'false', ...(q && { q }), ...(departmentId && { departmentId }), page: String(page), pageSize: String(pageSize) })}`),
  });

  const importExcel = useMutation({
    mutationFn: (file: File) => { const f = new FormData(); f.append('file', file); return api('/employees/import', { method: 'POST', body: f }); },
    onSuccess: (r: any) => {
      setImportMsg(`Қўшилди: ${r.created}, янгиланди: ${r.updated}${r.errors.length ? `, хатолар: ${r.errors.map((e: any) => `${e.row}-қатор: ${e.message}`).join('; ')}` : ''}`);
      qc.invalidateQueries({ queryKey: ['employees'] }); qc.invalidateQueries({ queryKey: ['stats'] });
    },
    onError: (e: Error) => setImportMsg(e.message),
  });

  const totalPages = Math.max(1, Math.ceil((list.data?.total ?? 0) / pageSize));
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-navy">Ходимлар</h1>
        <div className="flex gap-2">
          <input ref={fileRef} type="file" accept=".xlsx,.xls" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) importExcel.mutate(f); e.target.value = ''; }} />
          <button className="btn-secondary" onClick={() => fileRef.current?.click()} disabled={importExcel.isPending}><Upload size={16} /> Excel’дан юклаш</button>
          <button className="btn-primary" onClick={() => setCreating(true)}><Plus size={16} /> Янги ходим</button>
        </div>
      </div>
      {importMsg && <p className="card p-3 text-sm">{importMsg}</p>}
      <div className="flex flex-wrap gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
          <input className="input pl-9" placeholder="Ф.И.Ш., табель рақами ёки ЖШШИР" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
        </div>
        <select className="input w-auto" value={departmentId} onChange={(e) => { setDepartmentId(e.target.value); setPage(1); }}>
          <option value="">Барча бўлимлар</option>
          {departments.data?.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full">
          <thead className="border-b bg-slate-50"><tr>
            <th className="th">Табель</th><th className="th">Ф.И.Ш.</th><th className="th">Лавозим</th><th className="th">Бўлим</th><th className="th">Тури</th><th className="th">Ҳолат</th>
          </tr></thead>
          <tbody className="divide-y">
            {list.data?.items.map((e: any) => (
              <tr key={e.id} className="hover:bg-slate-50">
                <td className="td font-mono">{e.tabNumber}</td>
                <td className="td"><Link to={`/employees/${e.id}`} className="font-medium text-navy hover:text-brand">{fullName(e)}</Link></td>
                <td className="td">{e.position.title}</td>
                <td className="td text-slate-500">{e.department.name}</td>
                <td className="td text-slate-500">{EMP_TYPE_LABEL[e.employmentType]}</td>
                <td className="td"><StatusBadge status={e.status} /></td>
              </tr>
            ))}
            {list.data?.items.length === 0 && <tr><td colSpan={6} className="td py-10 text-center text-slate-500">Ходимлар топилмади</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between text-sm text-slate-500">
        <span>Жами: {list.data?.total ?? 0}</span>
        <div className="flex items-center gap-2">
          <button className="btn-secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>Олдинги</button>
          <span>{page} / {totalPages}</span>
          <button className="btn-secondary" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Кейинги</button>
        </div>
      </div>
      {creating && <EmployeeForm onClose={() => setCreating(false)} />}
    </div>
  );
}
