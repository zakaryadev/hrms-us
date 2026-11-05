import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, RotateCcw, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { api, fmtDate } from '../lib/api';
import { buttonStyles, cn } from '../components/kit';
import { PageHeader } from '../components/ui';

type Tpl = { lang: 'lat' | 'cyr'; name: string; label: string; size: number; modifiedAt: string; fields: string[]; custom: boolean };
const LANG: Record<string, string> = { lat: 'Лотин', cyr: 'Кирилл' };

export default function Templates() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'superadmin';
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['templates'], queryFn: () => api<Tpl[]>('/documents/templates') });
  const pick = useRef<HTMLInputElement>(null);
  const target = useRef<Tpl | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const upload = useMutation({
    mutationFn: ({ t, file }: { t: Tpl; file: File }) => {
      const f = new FormData(); f.append('file', file);
      return api<{ unknownFields: string[] }>(`/documents/templates/${t.lang}/${t.name}`, { method: 'PUT', body: f });
    },
    onSuccess: (r, { t }) => {
      qc.invalidateQueries({ queryKey: ['templates'] });
      setMsg({ ok: true, text: `«${t.label}» (${LANG[t.lang]}) шаблони янгиланди.${r.unknownFields.length ? ` Эътибор беринг: номаълум майдонлар бўш чиқади — ${r.unknownFields.map((x) => `{{${x}}}`).join(', ')}` : ''}` });
    },
    onError: (e: Error) => setMsg({ ok: false, text: e.message }),
  });
  const reset = useMutation({
    mutationFn: (t: Tpl) => api(`/documents/templates/${t.lang}/${t.name}`, { method: 'DELETE' }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['templates'] }); setMsg({ ok: true, text: 'Шаблон стандарт ҳолатга қайтарилди.' }); },
    onError: (e: Error) => setMsg({ ok: false, text: e.message }),
  });

  return (
    <div className="space-y-4">
      <PageHeader title="Ҳужжат шаблонлари" hint="Ҳужжатлар шу Word (DOCX) шаблонлардан яратилади. Юклаб олиб Word’да таҳрирланг ва қайта юкланг; {{майдон}} белгиларини ўзгартирманг." />
      <input ref={pick} type="file" hidden accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        onChange={(e) => { const file = e.target.files?.[0]; e.target.value = ''; if (file && target.current) { setMsg(null); upload.mutate({ t: target.current, file }); } }} />
      {msg && <div role="status" className={cn('card p-3 text-sm', msg.ok ? 'text-emerald-700' : 'text-red-600')}>{msg.text}</div>}
      <div className="card overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-slate-200"><tr><th className="th">Шаблон</th><th className="th">Ёзув</th><th className="th">Ўлчам</th><th className="th">Ўзгартирилган</th><th className="th">Майдонлар</th><th /></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {q.data?.map((t) => (
              <tr key={t.lang + t.name} className="align-top hover:bg-slate-50">
                <td className="td"><div className="font-medium">{t.label}</div><div className="font-mono text-xs text-slate-500">{t.name}.docx {t.custom && <span className="ml-1 rounded-full bg-brand-soft px-2 py-0.5 font-sans text-[11px] font-medium text-brand">юкланган</span>}</div></td>
                <td className="td">{LANG[t.lang] ?? t.lang}</td>
                <td className="td whitespace-nowrap">{(t.size / 1024).toFixed(1)} KB</td>
                <td className="td whitespace-nowrap">{fmtDate(t.modifiedAt)}</td>
                <td className="td">
                  <details><summary className="cursor-pointer text-sm text-slate-600">{t.fields.length} та майдон</summary>
                    <div className="mt-2 flex max-w-md flex-wrap gap-1">{t.fields.map((f) => <code key={f} className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">{`{{${f}}}`}</code>)}</div>
                  </details>
                </td>
                <td className="td text-right">
                  <div className="flex flex-wrap items-center justify-end gap-1">
                    <a className={cn(buttonStyles({ variant: 'secondary', size: 'sm' }))} href={`/api/documents/templates/${t.lang}/${t.name}/download`}><Download size={14} /> Юклаб олиш</a>
                    {isAdmin && <button className={cn(buttonStyles({ variant: 'secondary', size: 'sm' }))} disabled={upload.isPending} onClick={() => { target.current = t; pick.current?.click(); }}><Upload size={14} /> Алмаштириш</button>}
                    {isAdmin && t.custom && <button className={cn(buttonStyles({ variant: 'secondary', size: 'sm' }))} disabled={reset.isPending} onClick={() => confirm('Юкланган шаблон ўчирилиб, стандарти тикланади. Давом этайми?') && reset.mutate(t)}><RotateCcw size={14} /> Стандарт</button>}
                  </div>
                </td>
              </tr>
            ))}
            {q.data?.length === 0 && <tr><td colSpan={6} className="td py-10 text-center text-slate-500">Шаблонлар топилмади</td></tr>}
          </tbody>
        </table>
      </div>
      {!isAdmin && <p className="text-xs text-slate-500">Шаблонни алмаштириш фақат Суперадмин учун.</p>}
    </div>
  );
}
