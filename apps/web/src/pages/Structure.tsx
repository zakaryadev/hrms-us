import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Field } from '../components/ui';
import { api, fmtMoney } from '../lib/api';

export default function Structure() {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<string>('');
  const [err, setErr] = useState('');
  const departments = useQuery({ queryKey: ['departments'], queryFn: () => api<any[]>('/departments') });
  const current = selected || departments.data?.[0]?.id || '';
  const positions = useQuery({
    queryKey: ['positions', current], enabled: !!current,
    queryFn: () => api<any[]>(`/positions?departmentId=${current}`),
  });
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

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-navy">Bo'limlar va lavozimlar</h1>
      {err && <p className="card border-brand/30 p-3 text-sm text-brand">{err}</p>}
      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <div className="card p-4">
          <ul className="mb-4 space-y-1">
            {departments.data?.map((d) => (
              <li key={d.id} className={`flex items-center rounded-lg px-3 py-2 text-sm ${d.id === current ? 'bg-navy text-white' : 'hover:bg-slate-100'}`}>
                <button className="flex-1 text-left" onClick={() => setSelected(d.id)}>{d.name}</button>
                <button aria-label="O'chirish" className="opacity-60 hover:opacity-100" onClick={() => confirm(`"${d.name}" o'chirilsinmi?`) && delDept.mutate(d.id)}><Trash2 size={15} /></button>
              </li>
            ))}
          </ul>
          <form className="space-y-3 border-t pt-4" onSubmit={(e) => { e.preventDefault(); addDept.mutate(); }}>
            <Field label="Yangi bo'lim nomi *"><input required className="input" value={dn.name} onChange={(e) => setDn({ ...dn, name: e.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Kod"><input className="input" value={dn.code} onChange={(e) => setDn({ ...dn, code: e.target.value })} /></Field>
              <Field label="Yuqori bo'lim"><select className="input" value={dn.parentId} onChange={(e) => setDn({ ...dn, parentId: e.target.value })}><option value="">—</option>{departments.data?.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></Field>
            </div>
            <button className="btn-primary w-full justify-center" disabled={addDept.isPending}><Plus size={16} /> Bo'lim qo'shish</button>
          </form>
        </div>

        <div className="card p-4">
          <div className="mb-4 overflow-x-auto"><table className="w-full">
            <thead className="border-b"><tr><th className="th">Tartib</th><th className="th">Lavozim</th><th className="th">Oklad</th><th className="th">Shtat soni</th><th /></tr></thead>
            <tbody className="divide-y">
              {positions.data?.map((p) => (
                <tr key={p.id}><td className="td">{p.rankOrder}</td><td className="td font-medium">{p.title}</td><td className="td">{fmtMoney(p.baseSalary)}</td><td className="td">{p.staffCount}</td>
                  <td className="td text-right"><button aria-label="O'chirish" className="text-slate-400 hover:text-brand" onClick={() => confirm(`"${p.title}" o'chirilsinmi?`) && delPos.mutate(p.id)}><Trash2 size={16} /></button></td></tr>
              ))}
              {positions.data?.length === 0 && <tr><td colSpan={5} className="td text-slate-500">Bu bo'limda lavozim yo'q</td></tr>}
            </tbody>
          </table></div>
          {current && (
            <form className="grid items-end gap-3 border-t pt-4 sm:grid-cols-5" onSubmit={(e) => { e.preventDefault(); addPos.mutate(); }}>
              <div className="sm:col-span-2"><Field label="Yangi lavozim *"><input required className="input" value={pn.title} onChange={(e) => setPn({ ...pn, title: e.target.value })} /></Field></div>
              <Field label="Tartib"><input type="number" className="input" value={pn.rankOrder} onChange={(e) => setPn({ ...pn, rankOrder: e.target.value })} /></Field>
              <Field label="Oklad"><input type="number" className="input" value={pn.baseSalary} onChange={(e) => setPn({ ...pn, baseSalary: e.target.value })} /></Field>
              <Field label="Shtat soni"><input type="number" min={1} className="input" value={pn.staffCount} onChange={(e) => setPn({ ...pn, staffCount: e.target.value })} /></Field>
              <button className="btn-primary justify-center sm:col-span-5" disabled={addPos.isPending}><Plus size={16} /> Lavozim qo'shish</button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
