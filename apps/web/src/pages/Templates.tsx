import * as Popover from '@radix-ui/react-popover';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, Download, History, RotateCcw, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import DataTable, { actionBtn, type Column } from '../components/DataTable';
import { cn } from '../components/kit';
import { PageHeader } from '../components/ui';
import { api, fmtDate } from '../lib/api';

type Script = 'cyr' | 'lat' | 'lat-new';
type Source = 'custom' | 'bundled' | 'auto';
type Tpl = { name: string; label: string; custom: boolean; masterScript: Script | null; scripts: Record<Script, Source>; size: number; modifiedAt: string; fields: string[]; hasPrevious: boolean };
const SCRIPT_LABEL: Record<Script, string> = { cyr: 'Кирилл', lat: 'Лотин', 'lat-new': 'Янги алифбо' };
const SOURCE: Record<Source, [string, string]> = { custom: ['юкланган', 'bg-brand-soft text-brand'], bundled: ['стандарт', 'bg-slate-100 text-slate-600'], auto: ['автомат', 'bg-emerald-50 text-emerald-700'] };

function DownloadMenu({ t }: { t: Tpl }) {
  return (
    <Popover.Root>
      <Popover.Trigger asChild><button type="button" className={actionBtn}><Download size={14} /> Юклаб олиш <ChevronDown size={13} /></button></Popover.Trigger>
      <Popover.Portal>
        <Popover.Content align="end" sideOffset={6} className="z-50 w-56 rounded-lg border border-slate-200 bg-white p-1.5 shadow-lg">
          <p className="px-2 pb-1 pt-1 text-[11px] font-medium uppercase tracking-wide text-slate-500">Қайси ёзувда</p>
          {(Object.keys(SCRIPT_LABEL) as Script[]).map((s) => (
            <a key={s} href={`/api/documents/templates/${t.name}/download?script=${s}`} className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm text-slate-800 hover:bg-slate-100">
              {SCRIPT_LABEL[s]}<span className={cn('rounded-full px-2 py-0.5 text-[11px] font-medium', SOURCE[t.scripts[s]][1])}>{SOURCE[t.scripts[s]][0]}</span>
            </a>
          ))}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

export default function Templates() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'superadmin';
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['templates'], queryFn: () => api<Tpl[]>('/documents/templates') });
  const pick = useRef<HTMLInputElement>(null);
  const target = useRef<Tpl | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const done = (text: string) => { qc.invalidateQueries({ queryKey: ['templates'] }); setMsg({ ok: true, text }); };
  const fail = (e: Error) => setMsg({ ok: false, text: e.message });

  const upload = useMutation({
    mutationFn: ({ t, file }: { t: Tpl; file: File }) => {
      const f = new FormData(); f.append('file', file);
      return api<{ script: Script; unknownFields: string[] }>(`/documents/templates/${t.name}`, { method: 'PUT', body: f });
    },
    onSuccess: (r, { t }) => done(`«${t.label}» шаблони янгиланди. Ёзуви автоматик аниқланди: ${SCRIPT_LABEL[r.script]} — қолган ёзувлардаги ҳужжатлар унинг бутун матнини ўгириб ҳосил қилинади.${r.unknownFields.length ? ` Эътибор беринг: номаълум майдонлар бўш чиқади — ${r.unknownFields.map((x) => `{{${x}}}`).join(', ')}` : ''}`),
    onError: fail,
  });
  const reset = useMutation({ mutationFn: (t: Tpl) => api(`/documents/templates/${t.name}`, { method: 'DELETE' }), onSuccess: () => done('Шаблон стандарт ҳолатга қайтарилди.'), onError: fail });
  const restore = useMutation({ mutationFn: (t: Tpl) => api(`/documents/templates/${t.name}/restore`, { method: 'POST' }), onSuccess: () => done('Олдинги версия тикланди.'), onError: fail });

  const columns: Column<Tpl>[] = [
    { key: 'label', header: 'Шаблон', locked: true, minWidth: '12rem', value: (t) => t.label, cell: (t) => <><div className="font-medium">{t.label}</div><div className="font-mono text-xs text-slate-500">{t.name}.docx</div></> },
    {
      key: 'scripts', header: 'Ёзувлар', minWidth: '14rem', sortable: false, value: (t) => (Object.keys(SCRIPT_LABEL) as Script[]).map((s) => `${SCRIPT_LABEL[s]} ${SOURCE[t.scripts[s]][0]}`).join(' '),
      cell: (t) => (
        <div className="flex flex-wrap gap-1.5">
          {(Object.keys(SCRIPT_LABEL) as Script[]).map((s) => (
            <span key={s} className="inline-flex items-center gap-1 whitespace-nowrap rounded-md border border-slate-200 px-1.5 py-0.5 text-xs">
              {SCRIPT_LABEL[s]}<span className={cn('rounded px-1 text-[10px] font-medium', SOURCE[t.scripts[s]][1])}>{SOURCE[t.scripts[s]][0]}</span>
            </span>
          ))}
        </div>
      ),
    },
    { key: 'size', header: 'Ўлчам', nowrap: true, hidden: true, value: (t) => t.size, cell: (t) => `${(t.size / 1024).toFixed(1)} KB` },
    { key: 'modifiedAt', header: 'Ўзгартирилган', nowrap: true, value: (t) => t.modifiedAt, cell: (t) => fmtDate(t.modifiedAt) },
    {
      key: 'fields', header: 'Майдонлар', value: (t) => t.fields.join(' '), sortable: false, minWidth: '9rem',
      cell: (t) => <details><summary className="cursor-pointer text-sm text-slate-600">{t.fields.length} та майдон</summary><div className="mt-2 flex max-w-md flex-wrap gap-1">{t.fields.map((f) => <code key={f} className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">{`{{${f}}}`}</code>)}</div></details>,
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader title="Ҳужжат шаблонлари" hint="Ҳужжатлар шу Word (DOCX) шаблонлардан яратилади." />
      <input ref={pick} type="file" hidden accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        onChange={(e) => { const file = e.target.files?.[0]; e.target.value = ''; if (file && target.current) { setMsg(null); upload.mutate({ t: target.current, file }); } }} />
      <div className="card space-y-1 p-4 text-sm text-slate-600">
        <p><b className="text-slate-900">Битта шаблон юкланг — қолганини тизим ўзи қилади.</b> Ўз стандарт Word шаблонингизни (кирилл ёки лотинда) юклаб олсангиз, ёзуви автоматик аниқланади; ҳужжат кирилл, лотин ёки янги алифбода яратилганда <b>бутун матн</b> (шаблон матни ҳам, ходим маълумотлари ҳам) шу ёзувга ўзи ўгирилади. Форматлаш, жадвал ва расм ўзгармайди.</p>
        <p className="text-xs text-slate-500">Шаблонни ўзгартиришда {'{{майдон}}'} белгиларини ўзгартирманг. Кирилга ўгирилганда қўштирноқ ичидаги лотин номлар (“UNICON-SOFT”, “Ijro.gov.uz”) ўзгармайди.</p>
      </div>
      {msg && <div role="status" className={cn('card p-3 text-sm', msg.ok ? 'text-emerald-700' : 'text-red-600')}>{msg.text}</div>}
      <DataTable
        storageKey="templates2" columns={columns} rows={q.data} rowKey={(t) => t.name} loading={q.isLoading} pageSizeOptions={[10, 20]} initialPageSize={20}
        searchPlaceholder="Шаблон номи ёки майдон бўйича қидириш" emptyText="Шаблонлар топилмади"
        actions={(t) => (
          <>
            <DownloadMenu t={t} />
            {isAdmin && <button type="button" className={actionBtn} disabled={upload.isPending} onClick={() => { target.current = t; pick.current?.click(); }}><Upload size={14} /> Алмаштириш</button>}
            {isAdmin && t.hasPrevious && <button type="button" className={actionBtn} disabled={restore.isPending} onClick={() => confirm('Олдинги юкланган версия тикланади. Давом этайми?') && restore.mutate(t)}><History size={14} /> Олдинги</button>}
            {isAdmin && t.custom && <button type="button" className={actionBtn} disabled={reset.isPending} onClick={() => confirm('Юкланган шаблон ўчирилиб, стандарти тикланади. Давом этайми?') && reset.mutate(t)}><RotateCcw size={14} /> Стандарт</button>}
          </>
        )}
      />
      {!isAdmin && <p className="text-xs text-slate-500">Шаблонни алмаштириш фақат Суперадмин учун.</p>}
    </div>
  );
}
