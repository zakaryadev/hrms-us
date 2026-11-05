import { useQuery } from '@tanstack/react-query';
import { Download, FilePlus2, Pencil, Upload, User } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useCan } from '../auth/AuthContext';
import DataTable, { actionBtn, iconBtn, type Column, type Sort } from '../components/DataTable';
import EmployeeForm from '../components/EmployeeForm';
import { PageHeader, StatusBadge } from '../components/ui';
import { api, EMP_TYPE_LABEL, fmtDate, fmtMoney, fullName, photoSrc } from '../lib/api';
import { Avatar, Select, buttonStyles, cn } from '../components/kit';

export default function Employees() {
  const can = useCan();
  const [q, setQ] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sort, setSort] = useState<Sort>(null);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  // Юқори панелдаги «Янги ходим» тугмаси: /employees?new=1
  const [params, setParams] = useSearchParams();
  useEffect(() => { if (params.get('new') === '1') { setCreating(true); setParams({}, { replace: true }); } }, [params, setParams]);

  const departments = useQuery({ queryKey: ['departments'], queryFn: () => api<any[]>('/departments') });
  const base = { archived: 'false', ...(q && { q }), ...(departmentId && { departmentId }), ...(sort && { sortBy: sort.key, sortDir: sort.dir }) };
  const list = useQuery({
    queryKey: ['employees', q, departmentId, page, pageSize, sort],
    queryFn: () => api<{ items: any[]; total: number }>(`/employees?${new URLSearchParams({ ...base, page: String(page), pageSize: String(pageSize) })}`),
    placeholderData: (prev) => prev,
  });

  const columns: Column<any>[] = [
    { key: 'tabNumber', header: 'Табель', cell: (e) => <span className="font-mono">{e.tabNumber}</span>, value: (e) => e.tabNumber, nowrap: true },
    {
      key: 'fio', header: 'Ф.И.Ш.', locked: true, minWidth: '13rem', value: (e) => fullName(e),
      cell: (e) => <Link to={`/employees/${e.id}`} className="flex items-center gap-3 font-medium text-slate-950 hover:underline"><Avatar size={34} src={photoSrc(e.photoUrl)} name={fullName(e)} />{fullName(e)}</Link>,
    },
    { key: 'position', header: 'Лавозим', minWidth: '10rem', value: (e) => e.position.title },
    { key: 'department', header: 'Бўлим', minWidth: '10rem', className: 'text-slate-500', value: (e) => e.department.name },
    { key: 'employmentType', header: 'Тури', className: 'text-slate-500', value: (e) => EMP_TYPE_LABEL[e.employmentType] },
    { key: 'status', header: 'Ҳолат', cell: (e) => <StatusBadge status={e.status} />, value: (e) => e.status },
    { key: 'hireDate', header: 'Ишга қабул', nowrap: true, hidden: true, value: (e) => e.hireDate, cell: (e) => fmtDate(e.hireDate) },
    { key: 'birthDate', header: 'Туғилган сана', nowrap: true, hidden: true, value: (e) => e.birthDate, cell: (e) => fmtDate(e.birthDate) },
    { key: 'phone', header: 'Телефон', nowrap: true, hidden: true, value: (e) => e.phone },
    { key: 'salary', header: 'Ойлик', nowrap: true, hidden: true, align: 'right', value: (e) => Number(e.salary), cell: (e) => fmtMoney(e.salary) },
  ];

  return (
    <div className="space-y-4">
      <PageHeader title="Ходимлар" hint="Ишлаётган ходимлар: қидирув, устун бўйича тартиблаш, керакли устунларни танлаш ва қатордаги амаллар">
        <a href={`/api/employees/export?${new URLSearchParams(base)}`} className={cn(buttonStyles({ variant: 'secondary' }))}><Download size={16} /> Excel’га чиқариш</a>
        {can.write && <Link to="/import" className={cn(buttonStyles({ variant: 'secondary' }))}><Upload size={16} /> Excel’дан юклаш</Link>}
      </PageHeader>
      <DataTable
        storageKey="employees" columns={columns} rows={list.data?.items} rowKey={(e) => e.id} loading={list.isLoading}
        searchPlaceholder="Ф.И.Ш., табель рақами ёки ЖШШИР" emptyText="Ходимлар топилмади"
        manual={{
          total: list.data?.total ?? 0, page, pageSize, onPage: setPage, onPageSize: setPageSize, sort, onSort: setSort,
          search: q, onSearch: (s) => { setQ(s); setPage(1); },
        }}
        toolbar={
          <Select plain className="!w-auto" value={departmentId} onChange={(v) => { setDepartmentId(v); setPage(1); }}>
            <option value="">Барча бўлимлар</option>
            {departments.data?.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </Select>
        }
        actions={(e) => (
          <>
            <Link to={`/employees/${e.id}`} className={iconBtn} title="Профилни очиш" aria-label="Профилни очиш"><User size={16} /></Link>
            {can.write && <Link to={`/employees/${e.id}?tab=docs`} className={actionBtn} title="Ҳужжат яратиш"><FilePlus2 size={14} /> Ҳужжат</Link>}
            {can.write && <button type="button" className={iconBtn} title="Таҳрирлаш" aria-label="Таҳрирлаш" onClick={() => setEditing(e)}><Pencil size={16} /></button>}
          </>
        )}
      />
      {creating && can.write && <EmployeeForm onClose={() => setCreating(false)} />}
      {editing && can.write && <EmployeeForm employee={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}
