import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Button, Input, Select } from '../components/kit';
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
  const [q, setQ] = useState('');
  const [term, setTerm] = useState('');
  const [page, setPage] = useState(1);
  const res = useQuery({
    queryKey: ['audit', entity, term, page],
    queryFn: () => api<{ items: Row[]; total: number; pageSize: number }>(`/audit?page=${page}${entity ? `&entity=${entity}` : ''}${term ? `&q=${encodeURIComponent(term)}` : ''}`),
  });
  const pages = res.data ? Math.max(1, Math.ceil(res.data.total / res.data.pageSize)) : 1;
  return (
    <div className="space-y-4">
      <PageHeader title="Журнал" hint="Тизимдаги барча ўзгартирувчи амаллар: ким, қачон ва нима қилган. Фақат суперадмин кўради.">
        <Select plain className="!w-auto" value={entity} onChange={(v) => { setEntity(v); setPage(1); }}>
          <option value="">Барча бўлимлар</option>{Object.entries(ENTITY).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </Select>
        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); setTerm(q.trim()); setPage(1); }}>
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Логин ёки матн бўйича" />
          <Button type="submit" variant="secondary">Қидириш</Button>
        </form>
      </PageHeader>
      <div className="card overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-slate-200"><tr><th className="th">Вақт</th><th className="th">Фойдаланувчи</th><th className="th">Амал</th><th className="th">Бўлим</th><th className="th">Тафсилот</th><th className="th">IP</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {res.data?.items.map((r) => (
              <tr key={r.id} className="align-top hover:bg-slate-50">
                <td className="td whitespace-nowrap">{new Date(r.createdAt).toLocaleString('ru-RU')}</td>
                <td className="td"><div className="font-medium">{r.userName ?? r.userLogin ?? '—'}</div>{r.userName && <div className="font-mono text-xs text-slate-500">{r.userLogin}</div>}</td>
                <td className={r.action === 'delete' || r.action === 'login_failed' ? 'td font-medium text-red-600' : 'td'}>{ACTION[r.action] ?? r.action}</td>
                <td className="td">{ENTITY[r.entity] ?? r.entity}</td>
                <td className="td max-w-md break-words">{r.summary ?? <span className="font-mono text-xs text-slate-500">{r.method} {r.path}</span>}</td>
                <td className="td font-mono text-xs">{r.ip ?? '—'}</td>
              </tr>
            ))}
            {res.data?.items.length === 0 && <tr><td colSpan={6} className="td py-10 text-center text-slate-500">Ёзувлар йўқ</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between text-sm text-slate-600">
        <span>Жами: {res.data?.total ?? 0}</span>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Олдинги</Button>
          <span>{page} / {pages}</span>
          <Button variant="secondary" size="sm" disabled={page >= pages} onClick={() => setPage(page + 1)}>Кейинги</Button>
        </div>
      </div>
    </div>
  );
}
