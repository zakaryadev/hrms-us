import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Save, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Empty, ErrorNote, Field, Modal, PageHeader } from '../components/ui';
import { api, fmtMoney } from '../lib/api';
import { Button, Input, Select } from '../components/kit';

export default function Structure() {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<string>('');
  const [editDept, setEditDept] = useState<any | null>(null);
  const [editPos, setEditPos] = useState<any | null>(null);
  const departments = useQuery({ queryKey: ['departments'], queryFn: () => api<any[]>('/departments') });
  const current = selected || departments.data?.[0]?.id || '';
  const positions = useQuery({
    queryKey: ['positions', current], enabled: !!current,
    queryFn: () => api<any[]>(`/positions?departmentId=${current}`),
  });
  const [err, setErr] = useState('');
  const done = () => { setErr(''); qc.invalidateQueries({ queryKey: ['departments'] }); qc.invalidateQueries({ queryKey: ['positions'] }); qc.invalidateQueries({ queryKey: ['stats'] }); };
  const fail = (e: Error) => setErr(e.message);

  const [dn, setDn] = useState({ name: '', code: '', parentId: '' });
  const addDept = useMutation({
    mutationFn: () => api('/departments', { method: 'POST', body: JSON.stringify({ name: dn.name, ...(dn.code && { code: dn.code }), ...(dn.parentId && { parentId: dn.parentId }) }) }),
    onSuccess: (d: any) => { done(); setDn({ name: '', code: '', parentId: '' }); setSelected(d.id); }, onError: fail,
  });
  const delDept = useMutation({ mutationFn: (id: string) => api(`/departments/${id}`, { method: 'DELETE' }), onSuccess: () => { done(); setSelected(''); }, onError: fail });

  const [pn, setPn] = useState({ title: '', rankOrder: '100', baseSalary: '0', staffCount: '1' });
  const addPos = useMutation({
    mutationFn: () => api('/positions', { method: 'POST', body: JSON.stringify({ title: pn.title, departmentId: current, rankOrder: +pn.rankOrder, baseSalary: +pn.baseSalary, staffCount: +pn.staffCount }) }),
    onSuccess: () => { done(); setPn({ title: '', rankOrder: '100', baseSalary: '0', staffCount: '1' }); }, onError: fail,
  });
  const delPos = useMutation({ mutationFn: (id: string) => api(`/positions/${id}`, { method: 'DELETE' }), onSuccess: done, onError: fail });

  const parentName = (id?: string | null) => departments.data?.find((d) => d.id === id)?.name;

  return (
    <div className="space-y-4">
      <PageHeader title="Штат ва сон" hint="Бўлимлар (филиаллар) ва лавозимлар. «Штат сони» — шу лавозимдаги штат бирликлари, «Банд» — ишлаётган ходимлар." />
      {err && <ErrorNote error={new Error(err)} />}
      <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
        <div className="card p-4">
          <ul className="mb-4 space-y-1">
            {departments.data?.map((d) => (
              <li key={d.id} className={`flex items-center gap-1 rounded-md px-3 py-2 text-[13.5px] ${d.id === current ? 'bg-slate-100 font-medium text-slate-950' : 'hover:bg-slate-100'}`}>
                <button className="min-w-0 flex-1 text-left" onClick={() => setSelected(d.id)}>
                  <span className="block truncate">{d.name}</span>
                  {d.parentId && <span className={`block truncate text-[11px] text-slate-500`}>↳ {parentName(d.parentId)}</span>}
                </button>
                <button aria-label="Таҳрирлаш" className="opacity-60 hover:opacity-100" onClick={() => setEditDept(d)}><Pencil size={15} /></button>
                <button aria-label="Ўчириш" className="opacity-60 hover:opacity-100" onClick={() => confirm(`«${d.name}» ўчирилсинми?`) && delDept.mutate(d.id)}><Trash2 size={15} /></button>
              </li>
            ))}
            {departments.data?.length === 0 && <li><Empty>Бўлимлар йўқ</Empty></li>}
          </ul>
          <form className="space-y-3 border-t pt-4" onSubmit={(e) => { e.preventDefault(); addDept.mutate(); }}>
            <Field label="Янги бўлим номи *"><Input required value={dn.name} onChange={(e) => setDn({ ...dn, name: e.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Код"><Input value={dn.code} onChange={(e) => setDn({ ...dn, code: e.target.value })} /></Field>
              <Field label="Юқори бўлим"><Select value={dn.parentId} onChange={(v) => setDn({ ...dn, parentId: v })}><option value="">—</option>{departments.data?.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</Select></Field>
            </div>
            <Button variant="primary" className="w-full justify-center"  disabled={addDept.isPending}><Plus size={16} /> Бўлим қўшиш</Button>
          </form>
        </div>

        <div className="card p-4">
          <div className="mb-4 overflow-x-auto"><table className="w-full">
            <thead className="border-b"><tr><th className="th">Тартиб</th><th className="th">Лавозим</th><th className="th">Оклад</th><th className="th">Банд / Штат</th><th /></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {positions.data?.map((p) => (
                <tr key={p.id}>
                  <td className="td">{p.rankOrder}</td><td className="td font-medium">{p.title}</td><td className="td">{fmtMoney(p.baseSalary)}</td>
                  <td className={`td ${p.occupied > p.staffCount ? 'font-semibold text-red-600' : ''}`} title={p.occupied > p.staffCount ? 'Ходимлар штатдан кўп' : undefined}>{p.occupied} / {p.staffCount}</td>
                  <td className="td whitespace-nowrap text-right">
                    <button aria-label="Таҳрирлаш" className="mr-3 text-slate-400 hover:text-brand" onClick={() => setEditPos(p)}><Pencil size={16} /></button>
                    <button aria-label="Ўчириш" className="text-slate-400 hover:text-red-600" onClick={() => confirm(`«${p.title}» ўчирилсинми?`) && delPos.mutate(p.id)}><Trash2 size={16} /></button>
                  </td>
                </tr>
              ))}
              {positions.data?.length === 0 && <tr><td colSpan={5}><Empty>Бу бўлимда лавозим йўқ</Empty></td></tr>}
            </tbody>
          </table></div>
          {current && (
            <form className="grid items-end gap-3 border-t pt-4 sm:grid-cols-5" onSubmit={(e) => { e.preventDefault(); addPos.mutate(); }}>
              <div className="sm:col-span-2"><Field label="Янги лавозим *"><Input required value={pn.title} onChange={(e) => setPn({ ...pn, title: e.target.value })} /></Field></div>
              <Field label="Тартиб"><Input type="number" value={pn.rankOrder} onChange={(e) => setPn({ ...pn, rankOrder: e.target.value })} /></Field>
              <Field label="Оклад"><Input type="number" min={0} value={pn.baseSalary} onChange={(e) => setPn({ ...pn, baseSalary: e.target.value })} /></Field>
              <Field label="Штат сони"><Input type="number" min={1} value={pn.staffCount} onChange={(e) => setPn({ ...pn, staffCount: e.target.value })} /></Field>
              <Button variant="primary" className="justify-center sm:col-span-5"  disabled={addPos.isPending}><Plus size={16} /> Лавозим қўшиш</Button>
            </form>
          )}
        </div>
      </div>
      {editDept && <DeptModal dept={editDept} all={departments.data ?? []} onClose={() => setEditDept(null)} onSaved={done} />}
      {editPos && <PosModal pos={editPos} onClose={() => setEditPos(null)} onSaved={done} />}
    </div>
  );
}

function DeptModal({ dept, all, onClose, onSaved }: { dept: any; all: any[]; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({ name: dept.name, code: dept.code ?? '', parentId: dept.parentId ?? '' });
  const save = useMutation({
    mutationFn: () => api(`/departments/${dept.id}`, { method: 'PATCH', body: JSON.stringify({ name: f.name, code: f.code, parentId: f.parentId || null }) }),
    onSuccess: () => { onSaved(); onClose(); },
  });
  return (
    <Modal title="Бўлимни таҳрирлаш" onClose={onClose}>
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
        <Field label="Номи *"><Input required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Код"><Input value={f.code} onChange={(e) => setF({ ...f, code: e.target.value })} /></Field>
          <Field label="Юқори бўлим"><Select value={f.parentId} onChange={(v) => setF({ ...f, parentId: v })}><option value="">—</option>{all.filter((d) => d.id !== dept.id).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</Select></Field>
        </div>
        {save.error && <p className="text-sm text-red-600" role="alert">{(save.error as Error).message}</p>}
        <div className="flex justify-end gap-2 border-t pt-4"><Button variant="secondary" type="button"  onClick={onClose}>Бекор қилиш</Button><Button variant="primary"  disabled={save.isPending}><Save size={16} /> Сақлаш</Button></div>
      </form>
    </Modal>
  );
}

function PosModal({ pos, onClose, onSaved }: { pos: any; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({ title: pos.title, rankOrder: String(pos.rankOrder), baseSalary: String(Number(pos.baseSalary)), staffCount: String(pos.staffCount) });
  const save = useMutation({
    mutationFn: () => api(`/positions/${pos.id}`, { method: 'PATCH', body: JSON.stringify({ title: f.title, rankOrder: +f.rankOrder, baseSalary: +f.baseSalary, staffCount: +f.staffCount }) }),
    onSuccess: () => { onSaved(); onClose(); },
  });
  return (
    <Modal title="Лавозимни таҳрирлаш" onClose={onClose}>
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
        <Field label="Лавозим номи *"><Input required value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Тартиб"><Input type="number" value={f.rankOrder} onChange={(e) => setF({ ...f, rankOrder: e.target.value })} /></Field>
          <Field label="Оклад (сўм)"><Input type="number" min={0} value={f.baseSalary} onChange={(e) => setF({ ...f, baseSalary: e.target.value })} /></Field>
          <Field label="Штат сони"><Input type="number" min={1} value={f.staffCount} onChange={(e) => setF({ ...f, staffCount: e.target.value })} /></Field>
        </div>
        <p className="text-xs text-slate-500">Оклад ўзгартирилса, мавжуд ходимларнинг ойлик маоши ўзгармайди (у ходим картасида).</p>
        {save.error && <p className="text-sm text-red-600" role="alert">{(save.error as Error).message}</p>}
        <div className="flex justify-end gap-2 border-t pt-4"><Button variant="secondary" type="button"  onClick={onClose}>Бекор қилиш</Button><Button variant="primary"  disabled={save.isPending}><Save size={16} /> Сақлаш</Button></div>
      </form>
    </Modal>
  );
}
