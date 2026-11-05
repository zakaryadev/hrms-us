import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Field, PageHeader } from '../components/ui';
import { api } from '../lib/api';
import { Button, Input } from '../components/kit';
import { useCan } from '../auth/AuthContext';

const FIELDS: [string, string][] = [
  ['tashkilot_nomi', 'Ташкилот номи'], ['bosh_direktor_fish', 'Бош директор Ф.И.Ш.'], ['shahar', 'Шаҳар'],
  ['vakil_fish', 'Иш берувчи вакили Ф.И.Ш.'], ['ishonchnoma_matni', 'Ишончнома реквизитлари (рақам ва сана)'],
  ['ish_beruvchi_rekvizitlari', 'Иш берувчи реквизитлари (манзил, СТИР, ҳ/р, банк, МФО)'],
];

export default function Settings() {
  const can = useCan();
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
      <PageHeader title="Справочниклар" />
      <form className="card space-y-4 p-5" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
        <p className="text-sm text-slate-500">Бу маълумотлар барча ҳужжатларга (ариза, келишув, буйруқлар) автоматик қўйилади.</p>
        {FIELDS.map(([k, label]) => (
          <Field key={k} label={label}><Input readOnly={!can.admin} value={f[k] ?? ''} onChange={(e) => setF({ ...f, [k]: e.target.value })} /></Field>
        ))}
        {save.isSuccess && <p className="text-sm text-emerald-700">Сақланди</p>}
        {save.error && <p className="text-sm text-red-600">{(save.error as Error).message}</p>}
        {can.admin ? <Button variant="primary"  disabled={save.isPending}>Сақлаш</Button> : <p className="text-xs text-slate-500">Справочникларни фақат Суперадмин ўзгартиради.</p>}
      </form>
    </div>
  );
}
