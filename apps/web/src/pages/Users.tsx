import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { KeyRound, Pencil, Plus, Save } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { Empty, ErrorNote, Field, Loading, Modal, PageHeader } from '../components/ui';
import { api, fmtDate, ROLE_LABEL } from '../lib/api';
import { Button, Checkbox, Input, Select } from '../components/kit';

const ROLES: [string, string][] = [['kadrlar', 'Кадрлар ходими'], ['buxgalter', 'Бухгалтер'], ['superadmin', 'Суперадмин']];

export default function Users() {
  const { user: me } = useAuth();
  const q = useQuery({ queryKey: ['users'], queryFn: () => api<any[]>('/users') });
  const [edit, setEdit] = useState<any | 'new' | null>(null);
  return (
    <div className="space-y-4">
      <PageHeader eyebrow="Тизим" title="Фойдаланувчилар" hint="Тизимга кирувчи ҳисоблар. Кадрлар ходими ва Бухгалтер бир хил ҳуқуқда; фақат Суперадмин фойдаланувчиларни бошқаради.">
        <Button variant="primary"  onClick={() => setEdit('new')}><Plus size={16} /> Янги фойдаланувчи</Button>
      </PageHeader>
      {q.isLoading && <Loading />}
      <ErrorNote error={q.error} />
      {q.data && (
        <div className="card overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-slate-200"><tr><th className="th">Ф.И.Ш.</th><th className="th">Логин</th><th className="th">Роль</th><th className="th">Ҳолат</th><th className="th">Яратилган</th><th /></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {q.data.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50">
                  <td className="td font-medium">{u.fullName}{u.id === me?.id && <span className="ml-2 text-xs text-slate-400">(сиз)</span>}</td>
                  <td className="td font-mono text-xs">{u.login}</td><td className="td">{ROLE_LABEL[u.role]}</td>
                  <td className="td"><span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${u.active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{u.active ? 'Фаол' : 'Ўчирилган'}</span></td>
                  <td className="td">{fmtDate(u.createdAt)}</td>
                  <td className="td text-right"><Button variant="secondary" size="sm"  onClick={() => setEdit(u)}><Pencil size={14} /> Таҳрирлаш</Button></td>
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
        <Field label="Ф.И.Ш. *"><Input required minLength={2} value={f.fullName} onChange={(e) => setF({ ...f, fullName: e.target.value })} /></Field>
        <Field label="Логин *"><Input required minLength={2} pattern="[a-zA-Z0-9._\-]+" disabled={!!user} className="disabled:bg-slate-50" value={f.login} onChange={(e) => setF({ ...f, login: e.target.value })} /></Field>
        <Field label="Роль"><Select value={f.role} onChange={(v) => setF({ ...f, role: v })}>{ROLES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select></Field>
        <Field label={user ? 'Янги парол (бўш қолса ўзгармайди)' : 'Парол * (камида 8 белги)'}>
          <Input required={!user} type="password" autoComplete="new-password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
        </Field>
        {user && <Checkbox checked={f.active} onChange={(v) => setF({ ...f, active: v })}>Фаол (кира олади)</Checkbox>}
        {save.error && <p className="text-sm text-red-600" role="alert">{(save.error as Error).message}</p>}
        <div className="flex justify-end gap-2 border-t pt-4">
          <Button variant="secondary" type="button"  onClick={onClose}>Бекор қилиш</Button>
          <Button variant="primary"  disabled={save.isPending}><Save size={16} /> Сақлаш</Button>
        </div>
      </form>
    </Modal>
  );
}
