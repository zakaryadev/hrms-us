import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Trash2, Pencil } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { Empty, ErrorNote, Loading, PageHeader } from '../../components/ui';
import { Button, Field, Input, Modal, Textarea, cn } from '../../components/kit';
import { api } from '../../lib/api';
import { badgeCls, fmtD, fmtMin, KINDS, today, type FieldDef, type KindDef } from './config';

const selBase = 'h-9 rounded-md border border-slate-200 bg-white px-2 text-sm shadow-sm focus:outline-none focus:ring-[3px] focus:ring-slate-400/40';
const sel = 'h-9 w-full rounded-md border border-slate-200 bg-white px-2 text-sm shadow-sm focus:outline-none focus:ring-[3px] focus:ring-slate-400/40';
export const useJournalWrite = () => { const r = useAuth().user?.role; return r === 'superadmin' || r === 'operator'; };
export const useSettings = () => useQuery({ queryKey: ['j-settings'], queryFn: () => api<{ lists: Record<string, string[]>; normDays: number }>('/journal/settings'), staleTime: 60_000 });
export const useOrgs = () => useQuery({ queryKey: ['j-orgs'], queryFn: () => api<any[]>('/journal/orgs'), staleTime: 30_000 });

export function Badge({ v }: { v?: string }) {
  return v ? <span className={cn('inline-flex whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium', badgeCls(v))}>{v}</span> : null;
}

function cell(kind: KindDef, r: any, k: string) {
  if (k === '_time') return [r.start, r.end].filter(Boolean).join(' – ') + (r.durationMin != null ? ` · ${r.durationMin} дақ.` : '');
  if (k === 'orgId') return r.org ? <span>{r.org.name}{r.org.region && <span className="block text-xs text-slate-500">{r.org.region}</span>}</span> : '';
  if (k === 'ticketId') return r.ticket ? <span className="font-medium text-slate-900">{r.ticket.code}</span> : '';
  if (k === 'status' || k === 'priority') return <Badge v={r[k]} />;
  if (k === 'days') return r.days == null ? '' : r.days;
  const f = kind.fields.find((x) => x.k === k);
  if (f?.t === 'date') return <span className="whitespace-nowrap">{fmtD(r[k])}</span>;
  if (k === 'code') return <span className="whitespace-nowrap font-medium">{r[k]}</span>;
  if (f?.t === 'area' || k === 'problem') return <div className="line-clamp-3 max-w-[22rem]">{r[k]}</div>;
  return r[k] ?? '';
}

function RecordForm({ kind, rec, onClose }: { kind: KindDef; rec: any | null; onClose: () => void }) {
  const qc = useQueryClient();
  const settings = useSettings().data, orgs = useOrgs().data ?? [];
  const tickets = useQuery({ queryKey: ['j-tickets-pick'], queryFn: () => api<any>('/journal/tickets?pageSize=200') });
  const [v, setV] = useState<Record<string, any>>(() => {
    const o: Record<string, any> = {};
    for (const f of kind.fields) o[f.k] = rec ? (rec[f.k] ?? '') : f.def === 'today' ? today() : f.def ?? '';
    return o;
  });
  const set = (k: string, x: any) => setV((p) => ({ ...p, [k]: x }));
  const m = useMutation({
    mutationFn: () => {
      const body: Record<string, any> = { ...v };
      for (const f of kind.fields) if (f.t === 'number') body[f.k] = Number(body[f.k] || 0);
      return api(`/journal/${kind.key}${rec ? '/' + rec.id : ''}`, { method: rec ? 'PATCH' : 'POST', body: JSON.stringify(body) });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['j'] }); qc.invalidateQueries({ queryKey: ['j-tickets-pick'] }); onClose(); },
  });
  const submit = (e: FormEvent) => { e.preventDefault(); m.mutate(); };
  const control = (f: FieldDef) => {
    if (f.t === 'area') return <Textarea value={v[f.k]} onChange={(e) => set(f.k, e.target.value)} rows={3} />;
    if (f.t === 'select') {
      const opts = settings?.lists[f.list!] ?? [], cur = v[f.k];
      return <select className={sel} value={cur} onChange={(e) => set(f.k, e.target.value)}><option value="" />{(cur && !opts.includes(cur) ? [cur] : []).concat(opts).map((o) => <option key={o}>{o}</option>)}</select>;
    }
    if (f.t === 'org') return <select className={sel} value={v[f.k] ?? ''} onChange={(e) => set(f.k, e.target.value)}><option value="" />{orgs.map((o) => <option key={o.id} value={o.id}>{o.name}{o.region ? ` — ${o.region}` : ''}</option>)}</select>;
    if (f.t === 'ticket') return <select className={sel} value={v[f.k] ?? ''} onChange={(e) => set(f.k, e.target.value)}><option value="" />{(tickets.data?.items ?? []).map((t: any) => <option key={t.id} value={t.id}>{t.code} · {(t.problem ?? '').slice(0, 40)}</option>)}</select>;
    const type = f.t === 'number' ? 'number' : f.t;
    return <Input type={type} min={f.t === 'number' ? 0 : undefined} value={v[f.k] ?? ''} onChange={(e) => set(f.k, e.target.value)} />;
  };
  return (
    <Modal title={`${kind.title}: ${rec ? 'таҳрирлаш' : 'янги ёзув'}`} onClose={onClose} wide>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          {kind.fields.map((f) => <Field key={f.k} label={f.l + (f.req ? ' *' : '')} hint={f.hint} className={f.full ? 'sm:col-span-2' : ''}>{control(f)}</Field>)}
        </div>
        <p className="rounded-md border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-800">Парол, ЭРИ ёпиқ калитлари ва СМС-кодларни ёзманг. Шахсга доир маълумотни фақат хизмат зарурати доирасида киритинг.</p>
        <ErrorNote error={m.error} />
        <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={onClose}>Бекор қилиш</Button><Button type="submit" loading={m.isPending}>Сақлаш</Button></div>
      </form>
    </Modal>
  );
}

export default function JournalList({ kindKey }: { kindKey: KindDef['key'] }) {
  const kind = KINDS[kindKey], write = useJournalWrite(), qc = useQueryClient();
  const settings = useSettings().data;
  const [q, setQ] = useState(''), [month, setMonth] = useState(''), [status, setStatus] = useState(''), [mine, setMine] = useState(false);
  const [edit, setEdit] = useState<any | 'new' | null>(null);
  const params = new URLSearchParams({ pageSize: '100', ...(q && { q }), ...(month && { month }), ...(status && { status }), ...(mine && { mine: 'true' }) });
  const list = useQuery({ queryKey: ['j', kindKey, q, month, status, mine], queryFn: () => api<{ items: any[]; total: number }>(`/journal/${kindKey}?${params}`) });
  const del = useMutation({ mutationFn: (id: string) => api(`/journal/${kindKey}/${id}`, { method: 'DELETE' }), onSuccess: () => qc.invalidateQueries({ queryKey: ['j'] }) });
  const rows = list.data?.items ?? [];
  return (
    <div>
      <PageHeader title={kind.title} hint={kind.hint}>
        {write && <Button onClick={() => setEdit('new')}><Plus size={16} />Янги ёзув</Button>}
      </PageHeader>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[240px] flex-1 sm:max-w-sm"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><Input className="pl-9" translit={false} placeholder="Қидириш…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <input type="month" className={selBase} value={month} onChange={(e) => setMonth(e.target.value)} aria-label="Ой" />
        {kind.statusList && <select className={selBase} value={status} onChange={(e) => setStatus(e.target.value)}><option value="">Барча ҳолатлар</option>{(settings?.lists[kind.statusList] ?? []).map((s) => <option key={s}>{s}</option>)}</select>}
        <label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={mine} onChange={(e) => setMine(e.target.checked)} />Фақат меники</label>
        <span className="ml-auto text-sm text-slate-500">{list.data ? `${rows.length} / ${list.data.total} та ёзув` : ''}</span>
      </div>
      <ErrorNote error={list.error} />
      {list.isLoading ? <Loading /> : (
        <div className="card overflow-x-auto">
          {rows.length === 0 ? <Empty>Ёзув топилмади.</Empty> : (
            <table className="w-full text-left">
              <thead className="border-b bg-slate-50"><tr>{kind.cols.map((c) => <th key={c.k} className="th">{c.l}</th>)}{write && <th className="th" />}</tr></thead>
              <tbody className="divide-y">
                {rows.map((r) => (
                  <tr key={r.id} className="align-top hover:bg-slate-50/70">
                    {kind.cols.map((c) => <td key={c.k} className="td">{cell(kind, r, c.k)}</td>)}
                    {write && <td className="td whitespace-nowrap text-right">
                      <Button variant="ghost" size="icon" aria-label="Таҳрирлаш" onClick={() => setEdit(r)}><Pencil size={15} /></Button>
                      <Button variant="ghost" size="icon" aria-label="Ўчириш" onClick={() => confirm('Ёзув ўчирилсинми?') && del.mutate(r.id)}><Trash2 size={15} /></Button>
                    </td>}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
      {edit && <RecordForm kind={kind} rec={edit === 'new' ? null : edit} onClose={() => setEdit(null)} />}
    </div>
  );
}
export { fmtMin };
