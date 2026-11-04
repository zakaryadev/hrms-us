import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import EmployeeForm from '../components/EmployeeForm';
import { StatusBadge } from '../components/ui';
import { api, EMP_TYPE_LABEL, fullName, photoSrc } from '../lib/api';
import { Avatar, Button, Input, Select, buttonStyles, cn } from '../components/kit';

export default function Employees() {
  const qc = useQueryClient();
  const [q, setQ] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const pageSize = 15;

  const departments = useQuery({ queryKey: ['departments'], queryFn: () => api<any[]>('/departments') });
  const list = useQuery({
    queryKey: ['employees', q, departmentId, page],
    queryFn: () => api(`/employees?${new URLSearchParams({ archived: 'false', ...(q && { q }), ...(departmentId && { departmentId }), page: String(page), pageSize: String(pageSize) })}`),
  });


  const totalPages = Math.max(1, Math.ceil((list.data?.total ?? 0) / pageSize));
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-navy">Ходимлар</h1>
        <div className="flex gap-2">
          <Link to="/import" className={cn(buttonStyles({ variant: 'secondary' }))}><Upload size={16} /> Excel’дан юклаш</Link>
          <Button variant="primary"  onClick={() => setCreating(true)}><Plus size={16} /> Янги ходим</Button>
        </div>
      </div>
      <div className="flex flex-wrap gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
          <Input className="pl-9" placeholder="Ф.И.Ш., табель рақами ёки ЖШШИР" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
        </div>
        <Select className="!w-auto" value={departmentId} onChange={(v) => { setDepartmentId(v); setPage(1); }}>
          <option value="">Барча бўлимлар</option>
          {departments.data?.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </Select>
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
                <td className="td"><Link to={`/employees/${e.id}`} className="flex items-center gap-3 font-medium text-navy hover:text-brand"><Avatar size={34} src={photoSrc(e.photoUrl)} name={fullName(e)} />{fullName(e)}</Link></td>
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
          <Button variant="secondary"  disabled={page <= 1} onClick={() => setPage(page - 1)}>Олдинги</Button>
          <span>{page} / {totalPages}</span>
          <Button variant="secondary"  disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Кейинги</Button>
        </div>
      </div>
      {creating && <EmployeeForm onClose={() => setCreating(false)} />}
    </div>
  );
}
