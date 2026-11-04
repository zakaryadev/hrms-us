import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Field } from '../components/ui';
import { api } from '../lib/api';

const FIELDS: [string, string][] = [
  ['tashkilot_nomi', 'Ташкилот номи'], ['bosh_direktor_fish', 'Бош директор Ф.И.Ш.'], ['shahar', 'Шаҳар'],
  ['vakil_fish', 'Иш берувчи вакили Ф.И.Ш.'], ['ishonchnoma_matni', 'Ишончнома реквизитлари (рақам ва сана)'],
  ['ish_beruvchi_rekvizitlari', 'Иш берувчи реквизитлари (манзил, СТИР, ҳ/р, банк, МФО)'],
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
      <h1 className="text-2xl font-semibold text-ink">Справочниклар</h1>
      <form className="card space-y-4 p-5" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
        <p className="text-sm text-ink-500">Бу маълумотлар барча ҳужжатларга (ариза, келишув, буйруқлар) автоматик қўйилади.</p>
        {FIELDS.map(([k, label]) => (
          <Field key={k} label={label}><input className="input" value={f[k] ?? ''} onChange={(e) => setF({ ...f, [k]: e.target.value })} /></Field>
        ))}
        {save.isSuccess && <p className="text-sm text-emerald-700">Сақланди</p>}
        {save.error && <p className="text-sm text-red-600">{(save.error as Error).message}</p>}
        <button className="btn-primary" disabled={save.isPending}>Сақлаш</button>
      </form>
    </div>
  );
}
