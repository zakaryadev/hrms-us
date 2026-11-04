import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Field } from '../components/ui';
import { api } from '../lib/api';

const FIELDS: [string, string][] = [
  ['tashkilot_nomi', 'Tashkilot nomi'], ['bosh_direktor_fish', 'Bosh direktor F.I.Sh.'], ['shahar', 'Shahar'],
  ['vakil_fish', 'Ish beruvchi vakili F.I.Sh.'], ['ishonchnoma_matni', 'Ishonchnoma rekvizitlari (raqam va sana)'],
  ['ish_beruvchi_rekvizitlari', 'Ish beruvchi rekvizitlari (manzil, STIR, h/r, bank, MFO)'],
];

export default function Settings() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ['settings'], queryFn: () => api<Record<string, string>>('/settings') });
  const [f, setF] = useState<Record<string, string>>({});
  useEffect(() => { if (data) setF(data); }, [data]);
  const save = useMutation({
    mutationFn: () => api('/settings', { method: 'PUT', body: JSON.stringify(f) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['settings'] }),
  });
  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="text-2xl font-semibold text-navy">Sozlamalar</h1>
      <form className="card space-y-4 p-5" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
        <p className="text-sm text-slate-500">Bu ma'lumotlar barcha hujjatlarga (ariza, kelishuv, buyruqlar) avtomatik qo'yiladi.</p>
        {FIELDS.map(([k, label]) => (
          <Field key={k} label={label}><input className="input" value={f[k] ?? ''} onChange={(e) => setF({ ...f, [k]: e.target.value })} /></Field>
        ))}
        {save.isSuccess && <p className="text-sm text-emerald-700">Saqlandi</p>}
        {save.error && <p className="text-sm text-brand">{(save.error as Error).message}</p>}
        <button className="btn-primary" disabled={save.isPending}>Saqlash</button>
      </form>
    </div>
  );
}
