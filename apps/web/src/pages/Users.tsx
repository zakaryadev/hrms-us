import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { KeyRound, Pencil, Plus, Save } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { Empty, ErrorNote, Field, Loading, Modal, PageHeader } from '../components/ui';
import { api, fmtDate, ROLE_LABEL } from '../lib/api';

const ROLES: [string, string][] = [['kadrlar', 'Кадрлар ходими'], ['buxgalter', 'Бухгалтер'], ['superadmin', 'Суперадмин']];

export default function Users() {
  const { user: me } = useAuth();
  const q = useQuery({ queryKey: ['users'], queryFn: () => api<any[]>('/users') });
  const [edit, setEdit] = useState<any | 'new' | null>(null);
  return (
    <div className="space-y-4">
      <PageHeader title="Фойдаланувчилар" hint="Тизимга кирувчи ҳисоблар. Кадрлар ходими ва Бухгалтер бир хил ҳуқуқда; фақат Суперадмин фойдаланувчиларни бошқаради.">
        <button className="btn-primary" onClick={() => setEdit('new')}><Plus size={16} /> Янги фойдаланувчи</button>
      </PageHeader>
      {q.isLoading && <Loading />}
      <ErrorNote error={q.error} />
      {q.data && (
        <div className="card overflow-x-auto">
          <table className="w-full">
            <thead className="border-b bg-slate-50"><tr><th className="th">Ф.И.Ш.</th><th className="th">Логин</th><th className="th">Роль</th><th className="th">Ҳолат</th><th className="th">Яратилган</th><th /></tr></thead>
            <tbody className="divide-y">
              {q.data.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50">
                  <td className="td font-medium">{u.fullName}{u.id === me?.id && <span className="ml-2 text-xs text-slate-400">(сиз)</span>}</td>
                  <td className="td font-mono text-xs">{u.login}</td><td className="td">{ROLE_LABEL[u.role]}</td>
                  <td className="td"><span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${u.active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{u.active ? 'Фаол' : 'Ўчирилган'}</span></td>
                  <td className="td">{fmtDate(u.createdAt)}</td>
                  <td className="td text-right"><button className="btn-secondary !px-3 !py-1.5" onClick={() => setEdit(u)}><Pencil size={14} /> Таҳрирлаш</button></td>
                </tr>
              ))}
              {q.data.length === 0 && <tr><td colSpan={6}><Empty>Фойдаланувчилар йўқ</Empty></td></tr>}
            </tbody>
          </table>
        </div>
      )}
      {edit && <UserModal user={edit === 'new' ? null : edit} onClose={() => setEdit(null)} />}
    </div>
  );
}

function UserModal({ user, onClose }: { user: any | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [f, setF] = useState({ fullName: user?.fullName ?? '', login: user?.login ?? '', role: user?.role ?? 'kadrlar', active: user?.active ?? true, password: '' });
  const save = useMutation({
    mutationFn: () => user
      ? api(`/users/${user.id}`, { method: 'PATCH', body: JSON.stringify({ fullName: f.fullName, role: f.role, active: f.active, ...(f.password && { password: f.password }) }) })
      : api('/users', { method: 'POST', body: JSON.stringify({ fullName: f.fullName, login: f.login, role: f.role, password: f.password }) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); onClose(); },
  });
  return (
    <Modal title={user ? 'Фойдаланувчини таҳрирлаш' : 'Янги фойдаланувчи'} onClose={onClose}>
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
        <Field label="Ф.И.Ш. *"><input required minLength={2} className="input" value={f.fullName} onChange={(e) => setF({ ...f, fullName: e.target.value })} /></Field>
        <Field label="Логин *"><input required minLength={2} pattern="[a-zA-Z0-9._\-]+" disabled={!!user} className="input disabled:bg-slate-50" value={f.login} onChange={(e) => setF({ ...f, login: e.target.value })} /></Field>
        <Field label="Роль"><select className="input" value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })}>{ROLES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Field>
        <Field label={user ? 'Янги парол (бўш қолса ўзгармайди)' : 'Парол * (камида 8 белги)'}>
          <input required={!user} type="password" autoComplete="new-password" className="input" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
        </Field>
        {user && <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4 accent-blue-700" checked={f.active} onChange={(e) => setF({ ...f, active: e.target.checked })} /> Фаол (кира олади)</label>}
        {save.error && <p className="text-sm text-red-600" role="alert">{(save.error as Error).message}</p>}
        <div className="flex justify-end gap-2 border-t pt-4">
          <button type="button" className="btn-secondary" onClick={onClose}>Бекор қилиш</button>
          <button className="btn-primary" disabled={save.isPending}><Save size={16} /> Сақлаш</button>
        </div>
      </form>
    </Modal>
  );
}
