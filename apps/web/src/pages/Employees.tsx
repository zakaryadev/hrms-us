import { useQuery } from '@tanstack/react-query';
import { Download, Search, Upload } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import EmployeeForm from '../components/EmployeeForm';
import { PageHeader, StatusBadge } from '../components/ui';
import { api, EMP_TYPE_LABEL, fullName, photoSrc } from '../lib/api';
import { Avatar, Button, Input, Select, buttonStyles, cn } from '../components/kit';
import { useCan } from '../auth/AuthContext';

export default function Employees() {
  const can = useCan();
  const [q, setQ] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  // Юқори панелдаги «Янги ходим» тугмаси: /employees?new=1
  const [params, setParams] = useSearchParams();
  useEffect(() => { if (params.get('new') === '1') { setCreating(true); setParams({}, { replace: true }); } }, [params, setParams]);
  const pageSize = 15;

  const departments = useQuery({ queryKey: ['departments'], queryFn: () => api<any[]>('/departments') });
  const list = useQuery({
    queryKey: ['employees', q, departmentId, page],
    queryFn: () => api(`/employees?${new URLSearchParams({ archived: 'false', ...(q && { q }), ...(departmentId && { departmentId }), page: String(page), pageSize: String(pageSize) })}`),
  });


  const totalPages = Math.max(1, Math.ceil((list.data?.total ?? 0) / pageSize));
  return (
    <div className="space-y-4">
      <PageHeader title="Ходимлар" hint="Ишлаётган ходимлар рўйхати: қидирув, бўлим бўйича фильтр, янги ходим қўшиш">
          <a href={`/api/employees/export?${new URLSearchParams({ archived: 'false', ...(q && { q }), ...(departmentId && { departmentId }) })}`} className={cn(buttonStyles({ variant: 'secondary' }))}><Download size={16} /> Excel’га чиқариш</a>
          {can.write && <Link to="/import" className={cn(buttonStyles({ variant: 'secondary' }))}><Upload size={16} /> Excel’дан юклаш</Link>}
        </PageHeader>
      <div className="card flex flex-wrap items-center gap-3 p-3">
        <div className="relative min-w-[220px] flex-1">
          <Search size={16} className="pointer-events-none absolute left-3 top-[10px] text-slate-400" />
          <Input className="pl-9" placeholder="Ф.И.Ш., табель рақами ёки ЖШШИР" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
        </div>
        <Select plain className="!w-auto" value={departmentId} onChange={(v) => { setDepartmentId(v); setPage(1); }}>
          <option value="">Барча бўлимлар</option>
          {departments.data?.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </Select>
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-slate-200"><tr>
            <th className="th">Табель</th><th className="th">Ф.И.Ш.</th><th className="th">Лавозим</th><th className="th">Бўлим</th><th className="th">Тури</th><th className="th">Ҳолат</th>
          </tr></thead>
          <tbody className="divide-y divide-slate-100">
            {list.data?.items.map((e: any) => (
              <tr key={e.id} className="hover:bg-slate-50">
                <td className="td font-mono">{e.tabNumber}</td>
                <td className="td min-w-[13rem]"><Link to={`/employees/${e.id}`} className="flex items-center gap-3 font-medium text-slate-950 hover:underline"><Avatar size={34} src={photoSrc(e.photoUrl)} name={fullName(e)} />{fullName(e)}</Link></td>
                <td className="td min-w-[10rem]">{e.position.title}</td>
                <td className="td min-w-[10rem] text-slate-500">{e.department.name}</td>
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
      {creating && can.write && <EmployeeForm onClose={() => setCreating(false)} />}
    </div>
  );
}
