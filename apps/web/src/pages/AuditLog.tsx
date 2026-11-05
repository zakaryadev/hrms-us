import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import DataTable, { type Column } from '../components/DataTable';
import { Select } from '../components/kit';
import { PageHeader } from '../components/ui';
import { api } from '../lib/api';

const ACTION: Record<string, string> = {
  create: 'Яратиш', update: 'Ўзгартириш', delete: 'Ўчириш', login: 'Кириш', login_failed: 'Кириш муваффақиятсиз',
  logout: 'Чиқиш', setup: 'Бошланғич созлаш', 'change-password': 'Парол алмаштириш',
};
const ENTITY: Record<string, string> = {
  employees: 'Ходимлар', documents: 'Ҳужжатлар', orders: 'Буйруқлар', departments: 'Бўлимлар', positions: 'Лавозимлар',
  users: 'Фойдаланувчилар', settings: 'Справочниклар', calendar: 'Календарь', timesheet: 'Табель', auth: 'Авторизация',
};
type Row = { id: string; createdAt: string; userLogin: string | null; userName: string | null; action: string; entity: string; entityId: string | null; summary: string | null; method: string; path: string; status: number; ip: string | null };

export default function AuditLog() {
  const [entity, setEntity] = useState('');
  const [term, setTerm] = useState('');
  const [page, setPage] = useState(1);
  const res = useQuery({
    queryKey: ['audit', entity, term, page],
    queryFn: () => api<{ items: Row[]; total: number; pageSize: number }>(`/audit?page=${page}${entity ? `&entity=${entity}` : ''}${term ? `&q=${encodeURIComponent(term)}` : ''}`),
    placeholderData: (prev) => prev,
  });
  const columns: Column<Row>[] = [
    { key: 'createdAt', header: 'Вақт', nowrap: true, sortable: false, cell: (r) => new Date(r.createdAt).toLocaleString('ru-RU') },
    { key: 'user', header: 'Фойдаланувчи', sortable: false, minWidth: '9rem', cell: (r) => <><div className="font-medium">{r.userName ?? r.userLogin ?? '—'}</div>{r.userName && <div className="font-mono text-xs text-slate-500">{r.userLogin}</div>}</> },
    { key: 'action', header: 'Амал', sortable: false, cell: (r) => <span className={r.action === 'delete' || r.action === 'login_failed' ? 'font-medium text-red-600' : undefined}>{ACTION[r.action] ?? r.action}</span> },
    { key: 'entity', header: 'Бўлим', sortable: false, cell: (r) => ENTITY[r.entity] ?? r.entity },
    { key: 'summary', header: 'Тафсилот', sortable: false, minWidth: '14rem', cell: (r) => r.summary ?? <span className="font-mono text-xs text-slate-500">{r.method} {r.path}</span> },
    { key: 'ip', header: 'IP', sortable: false, hidden: true, cell: (r) => <span className="font-mono text-xs">{r.ip ?? '—'}</span> },
    { key: 'path', header: 'Йўл (API)', sortable: false, hidden: true, cell: (r) => <span className="font-mono text-xs text-slate-500">{r.method} {r.path} · {r.status}</span> },
  ];
  return (
    <div className="space-y-4">
      <PageHeader title="Журнал" hint="Тизимдаги барча ўзгартирувчи амаллар: ким, қачон ва нима қилган. Фақат суперадмин кўради." />
      <DataTable
        storageKey="audit" columns={columns} rows={res.data?.items} rowKey={(r) => r.id} loading={res.isLoading} initialPageSize={50} pageSizeOptions={[50]}
        searchPlaceholder="Логин ёки матн бўйича қидириш" emptyText="Ёзувлар йўқ"
        manual={{
          total: res.data?.total ?? 0, page, pageSize: res.data?.pageSize ?? 50, onPage: setPage, sort: null, onSort: () => undefined,
          search: term, onSearch: (s) => { setTerm(s.trim()); setPage(1); },
        }}
        toolbar={
          <Select plain className="!w-auto" value={entity} onChange={(v) => { setEntity(v); setPage(1); }}>
            <option value="">Барча бўлимлар</option>{Object.entries(ENTITY).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select>
        }
      />
    </div>
  );
}
