import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import EmployeeForm from '../components/EmployeeForm';
import { StatusBadge } from '../components/ui';
import { api, fullName } from '../lib/api';

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
    queryFn: () => api(`/employees?${new URLSearchParams({ ...(q && { q }), ...(departmentId && { departmentId }), page: String(page), pageSize: String(pageSize) })}`),
  });

  const importExcel = useMutation({
    mutationFn: (file: File) => { const f = new FormData(); f.append('file', file); return api('/employees/import', { method: 'POST', body: f }); },
    onSuccess: (r: any) => {
      setImportMsg(`Yaratildi: ${r.created}, yangilandi: ${r.updated}${r.errors.length ? `, xatolar: ${r.errors.map((e: any) => `${e.row}-qator: ${e.message}`).join('; ')}` : ''}`);
      qc.invalidateQueries({ queryKey: ['employees'] }); qc.invalidateQueries({ queryKey: ['stats'] });
    },
    onError: (e: Error) => setImportMsg(e.message),
  });

  const totalPages = Math.max(1, Math.ceil((list.data?.total ?? 0) / pageSize));
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-navy">Xodimlar</h1>
        <div className="flex gap-2">
          <input ref={fileRef} type="file" accept=".xlsx,.xls" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) importExcel.mutate(f); e.target.value = ''; }} />
          <button className="btn-secondary" onClick={() => fileRef.current?.click()} disabled={importExcel.isPending}><Upload size={16} /> Excel import</button>
          <button className="btn-primary" onClick={() => setCreating(true)}><Plus size={16} /> Yangi xodim</button>
        </div>
      </div>
      {importMsg && <p className="card p-3 text-sm">{importMsg}</p>}
      <div className="flex flex-wrap gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
          <input className="input pl-9" placeholder="F.I.Sh., tabel raqami yoki JSHSHIR" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
        </div>
        <select className="input w-auto" value={departmentId} onChange={(e) => { setDepartmentId(e.target.value); setPage(1); }}>
          <option value="">Barcha bo'limlar</option>
          {departments.data?.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full">
          <thead className="border-b bg-slate-50"><tr>
            <th className="th">Tabel</th><th className="th">F.I.Sh.</th><th className="th">Lavozim</th><th className="th">Bo'lim</th><th className="th">Turi</th><th className="th">Holat</th>
          </tr></thead>
          <tbody className="divide-y">
            {list.data?.items.map((e: any) => (
              <tr key={e.id} className="hover:bg-slate-50">
                <td className="td font-mono">{e.tabNumber}</td>
                <td className="td"><Link to={`/employees/${e.id}`} className="font-medium text-navy hover:text-brand">{fullName(e)}</Link></td>
                <td className="td">{e.position.title}</td>
                <td className="td text-slate-500">{e.department.name}</td>
                <td className="td uppercase text-slate-500">{e.employmentType}</td>
                <td className="td"><StatusBadge status={e.status} /></td>
              </tr>
            ))}
            {list.data?.items.length === 0 && <tr><td colSpan={6} className="td py-10 text-center text-slate-500">Xodimlar topilmadi</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between text-sm text-slate-500">
        <span>Jami: {list.data?.total ?? 0}</span>
        <div className="flex items-center gap-2">
          <button className="btn-secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>Oldingi</button>
          <span>{page} / {totalPages}</span>
          <button className="btn-secondary" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Keyingi</button>
        </div>
      </div>
      {creating && <EmployeeForm onClose={() => setCreating(false)} />}
    </div>
  );
}
