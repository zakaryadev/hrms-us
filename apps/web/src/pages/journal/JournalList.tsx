import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { Button, Field, Input, Modal, Textarea, cn } from '../../components/kit';
import { Empty, ErrorNote, Loading, PageHeader } from '../../components/ui';
import { api } from '../../lib/api';
import { useT } from '../../lib/script';
import { badgeCls, fmtD, fmtMin, KINDS, today, type FieldDef, type KindDef } from './config';

const selBase = 'h-9 rounded-md border border-slate-200 bg-white px-2 text-sm shadow-sm focus:outline-none focus:ring-[3px] focus:ring-slate-400/40';
const sel = 'w-full ' + selBase;
export const useJournalWrite = () => { const r = useAuth().user?.role; return r === 'superadmin' || r === 'operator'; };
export const useSettings = () => useQuery({ queryKey: ['j-settings'], queryFn: () => api<{ lists: Record<string, string[]>; normDays: number }>('/journal/settings'), staleTime: 60_000 });
export const useOrgs = () => useQuery({ queryKey: ['j-orgs'], queryFn: () => api<any[]>('/journal/orgs'), staleTime: 30_000 });

export function Badge({ v }: { v?: string }) {
  const t = useT();
  return v ? <span className={cn('inline-flex whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium', badgeCls(v))}>{t(v)}</span> : null;
}

function Cell({ kind, r, k, onTicket }: { kind: KindDef; r: any; k: string; onTicket: (id: string) => void }) {
  const t = useT();
  if (k === '_time') return <>{[r.start, r.end].filter(Boolean).join(' – ') + (r.durationMin != null ? ` · ${r.durationMin} ${t('дақ.')}` : '')}</>;
  if (k === 'orgId') return r.org ? <span>{r.org.name}{r.org.region && <span className="block text-xs text-slate-500">{t(r.org.region)}</span>}</span> : null;
  if (k === 'ticketId') return r.ticket ? <button className="whitespace-nowrap font-medium text-slate-900 hover:underline" onClick={() => onTicket(r.ticket.id)}>{r.ticket.code}</button> : null;
  if (k === 'code') return kind.key === 'tickets'
    ? <button className="whitespace-nowrap font-medium text-slate-900 hover:underline" onClick={() => onTicket(r.id)}>{r.code}</button>
    : <span className="whitespace-nowrap font-medium">{r.code}</span>;
  if (k === 'status' || k === 'priority') return <Badge v={r[k]} />;
  if (k === 'days') return <>{r.days ?? ''}</>;
  const f = kind.fields.find((x) => x.k === k);
  if (f?.t === 'date') return <span className="whitespace-nowrap">{fmtD(r[k])}</span>;
  if (f?.t === 'select') return <>{t(r[k])}</>;
  if (f?.t === 'area' || k === 'problem') return <div className="line-clamp-3 max-w-[22rem]">{r[k]}</div>;
  return <>{r[k] ?? ''}</>;
}

export function RecordForm({ kind, rec, preset, onClose }: { kind: KindDef; rec: any | null; preset?: Record<string, any>; onClose: () => void }) {
  const qc = useQueryClient(), t = useT();
  const settings = useSettings().data, orgs = useOrgs().data ?? [];
  const tickets = useQuery({ queryKey: ['j-tickets-pick'], queryFn: () => api<any>('/journal/tickets?pageSize=200') });
  const [v, setV] = useState<Record<string, any>>(() => {
    const o: Record<string, any> = {};
    for (const f of kind.fields) o[f.k] = rec ? (rec[f.k] ?? '') : preset?.[f.k] ?? (f.def === 'today' ? today() : f.def ?? '');
    return o;
  });
  const set = (k: string, x: any) => setV((p) => ({ ...p, [k]: x }));
  const m = useMutation({
    mutationFn: () => {
      const body: Record<string, any> = { ...v };
      for (const f of kind.fields) if (f.t === 'number') body[f.k] = Number(body[f.k] || 0);
      return api(`/journal/${kind.key}${rec ? '/' + rec.id : ''}`, { method: rec ? 'PATCH' : 'POST', body: JSON.stringify(body) });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['j'] }); qc.invalidateQueries({ queryKey: ['j-tickets-pick'] }); qc.invalidateQueries({ queryKey: ['j-ticket'] }); onClose(); },
  });
  const submit = (e: FormEvent) => { e.preventDefault(); m.mutate(); };
  const control = (f: FieldDef) => {
    if (f.t === 'area') return <Textarea translit={false} value={v[f.k]} onChange={(e) => set(f.k, e.target.value)} rows={3} />;
    if (f.t === 'select') {
      const opts = settings?.lists[f.list!] ?? [], cur = v[f.k];
      return <select className={sel} value={cur} onChange={(e) => set(f.k, e.target.value)}><option value="" />{(cur && !opts.includes(cur) ? [cur] : []).concat(opts).map((o) => <option key={o} value={o}>{t(o)}</option>)}</select>;
    }
    if (f.t === 'org') return <select className={sel} value={v[f.k] ?? ''} onChange={(e) => set(f.k, e.target.value)}><option value="" />{orgs.map((o) => <option key={o.id} value={o.id}>{o.name}{o.region ? ` — ${t(o.region)}` : ''}</option>)}</select>;
    if (f.t === 'ticket') return <select className={sel} value={v[f.k] ?? ''} onChange={(e) => set(f.k, e.target.value)}><option value="" />{(tickets.data?.items ?? []).map((x: any) => <option key={x.id} value={x.id}>{x.code} · {(x.problem ?? '').slice(0, 40)}</option>)}</select>;
    return <Input translit={false} type={f.t === 'number' ? 'number' : f.t} min={f.t === 'number' ? 0 : undefined} value={v[f.k] ?? ''} onChange={(e) => set(f.k, e.target.value)} />;
  };
  return (
    <Modal title={`${t(kind.title)}: ${t(rec ? 'таҳрирлаш' : 'янги ёзув')}`} onClose={onClose} wide>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          {kind.fields.map((f) => <Field key={f.k} label={t(f.l) + (f.req ? ' *' : '')} hint={t(f.hint)} className={f.full ? 'sm:col-span-2' : ''}>{control(f)}</Field>)}
        </div>
        <p className="rounded-md border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-800">{t('Парол, ЭРИ ёпиқ калитлари ва СМС-кодларни ёзманг. Шахсга доир маълумотни фақат хизмат зарурати доирасида киритинг.')}</p>
        <ErrorNote error={m.error} />
        <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={onClose}>{t('Бекор қилиш')}</Button><Button type="submit" loading={m.isPending}>{t('Сақлаш')}</Button></div>
      </form>
    </Modal>
  );
}

/** Мурожаат тафсилоти: боғланган ишлар, материаллар ва ўқитишлар бир жойда */
function TicketDetail({ id, onClose }: { id: string; onClose: () => void }) {
  const t = useT(), write = useJournalWrite();
  const q = useQuery({ queryKey: ['j-ticket', id], queryFn: () => api<any>(`/journal/tickets/${id}`) });
  const [add, setAdd] = useState<null | { kind: KindDef; preset: Record<string, any> }>(null);
  const d = q.data;
  const kv = (l: string, v: any, full?: boolean) => <div className={full ? 'sm:col-span-2' : ''}><p className="label">{t(l)}</p><p className="text-sm">{v || <span className="text-slate-400">—</span>}</p></div>;
  const section = (title: string, empty: string, head: string[], rows: any[][]) => (
    <div><h3 className="eyebrow mb-2">{t(title)}</h3>
      {rows.length === 0 ? <p className="text-sm text-slate-400">{t(empty)}</p> : (
        <table className="w-full text-left text-sm"><thead><tr>{head.map((h) => <th key={h} className="pb-1 pr-3 text-xs font-medium text-slate-500">{t(h)}</th>)}</tr></thead>
          <tbody className="divide-y">{rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j} className="py-1.5 pr-3 align-top">{c}</td>)}</tr>)}</tbody></table>)}
    </div>);
  return (
    <>
      <Modal title={d ? `${d.code}` : t('Мурожаат')} onClose={onClose} wide>
        {!d ? <Loading /> : (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2"><Badge v={d.status} /><Badge v={d.priority} />{d.days != null && <span className="text-sm text-slate-500">{d.days} {t('кун')}</span>}</div>
            <div className="grid gap-3 sm:grid-cols-2">
              {kv('Ташкилот', d.org?.name)}{kv('Қабул қилинган сана', fmtD(d.received))}
              {kv('Категория', t(d.category))}{kv('Ҳал этилган сана', fmtD(d.resolved))}
              {kv('Муаммо тавсифи', d.problem, true)}{kv('Кўрилган чоралар', d.actions, true)}
            </div>
            {section(`Бажарилган ишлар — ${d.entries.length}${d.minutes ? ', жами ' + fmtMin(d.minutes) : ''}`, 'Бу мурожаатга ҳали иш боғланмаган.', ['Сана', 'Иш тури', 'Бажарилган иш', 'Вақт'],
              d.entries.map((e: any) => [fmtD(e.date), t(e.type), e.done || e.content, e.durationMin != null ? `${e.durationMin} ${t('дақ.')}` : '']))}
            {section(`Билимлар базаси материаллари — ${d.kb.length}`, 'Бу мурожаатдан материал яратилмаган.', ['ID', 'Савол / муаммо', 'Ҳолат'], d.kb.map((k: any) => [k.code, k.question, <Badge key="b" v={k.status} />]))}
            {section(`Ўқитишлар — ${d.trainings.length}`, 'Бу мурожаат сабаб бўлган ўқитиш йўқ.', ['Сана', 'Мавзу', 'Иштирокчилар'], d.trainings.map((r: any) => [fmtD(r.date), r.topic, r.count]))}
            {write && (
              <div className="flex flex-wrap justify-end gap-2 border-t pt-4">
                <Button variant="secondary" size="sm" onClick={() => setAdd({ kind: KINDS.entries, preset: { ticketId: d.id, orgId: d.orgId ?? '' } })}><Plus size={14} />{t('Иш')}</Button>
                <Button variant="secondary" size="sm" onClick={() => setAdd({ kind: KINDS.kb, preset: { ticketId: d.id, category: d.category, question: d.problem } })}><Plus size={14} />{t('Материал')}</Button>
                <Button variant="secondary" size="sm" onClick={() => setAdd({ kind: KINDS.trainings, preset: { ticketId: d.id, orgId: d.orgId ?? '' } })}><Plus size={14} />{t('Ўқитиш')}</Button>
                <Button size="sm" onClick={onClose}>{t('Ёпиш')}</Button>
              </div>)}
          </div>)}
      </Modal>
      {add && <RecordForm kind={add.kind} rec={null} preset={add.preset} onClose={() => setAdd(null)} />}
    </>
  );
}

export default function JournalList({ kindKey }: { kindKey: KindDef['key'] }) {
  const kind = KINDS[kindKey], write = useJournalWrite(), qc = useQueryClient(), t = useT();
  const settings = useSettings().data;
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState(''), [month, setMonth] = useState(''), [status, setStatus] = useState(''), [mine, setMine] = useState(false);
  const [edit, setEdit] = useState<any | 'new' | null>(null);
  const [view, setView] = useState<string | null>(null);
  const openId = params.get('open') ?? view;
  const closeView = () => { setView(null); if (params.has('open')) { params.delete('open'); setParams(params, { replace: true }); } };
  const qs = new URLSearchParams({ pageSize: '100', ...(q && { q }), ...(month && { month }), ...(status && { status }), ...(mine && { mine: 'true' }) });
  const list = useQuery({ queryKey: ['j', kindKey, q, month, status, mine], queryFn: () => api<{ items: any[]; total: number }>(`/journal/${kindKey}?${qs}`) });
  const del = useMutation({ mutationFn: (id: string) => api(`/journal/${kindKey}/${id}`, { method: 'DELETE' }), onSuccess: () => qc.invalidateQueries({ queryKey: ['j'] }) });
  const rows = list.data?.items ?? [];
  return (
    <div>
      <PageHeader title={t(kind.title)} hint={t(kind.hint)}>
        {write && <Button onClick={() => setEdit('new')}><Plus size={16} />{t('Янги ёзув')}</Button>}
      </PageHeader>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[240px] flex-1 sm:max-w-sm"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><Input className="pl-9" translit={false} placeholder={t('Қидириш…')} value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <input type="month" className={selBase} value={month} onChange={(e) => setMonth(e.target.value)} aria-label={t('Ой')} />
        {kind.statusList && <select className={selBase} value={status} onChange={(e) => setStatus(e.target.value)}><option value="">{t('Барча ҳолатлар')}</option>{(settings?.lists[kind.statusList] ?? []).map((s) => <option key={s} value={s}>{t(s)}</option>)}</select>}
        <label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={mine} onChange={(e) => setMine(e.target.checked)} />{t('Фақат меники')}</label>
        <span className="ml-auto text-sm text-slate-500">{list.data ? `${rows.length} / ${list.data.total} ${t('та ёзув')}` : ''}</span>
      </div>
      <ErrorNote error={list.error} />
      {list.isLoading ? <Loading /> : (
        <div className="card overflow-x-auto">
          {rows.length === 0 ? <Empty>{t('Ёзув топилмади.')}</Empty> : (
            <table className="w-full text-left">
              <thead className="border-b bg-slate-50"><tr>{kind.cols.map((c) => <th key={c.k} className="th">{t(c.l)}</th>)}{write && <th className="th" />}</tr></thead>
              <tbody className="divide-y">
                {rows.map((r) => (
                  <tr key={r.id} className="align-top hover:bg-slate-50/70">
                    {kind.cols.map((c) => <td key={c.k} className="td"><Cell kind={kind} r={r} k={c.k} onTicket={setView} /></td>)}
                    {write && <td className="td whitespace-nowrap text-right">
                      <Button variant="ghost" size="icon" aria-label={t('Таҳрирлаш')} onClick={() => setEdit(r)}><Pencil size={15} /></Button>
                      <Button variant="ghost" size="icon" aria-label={t('Ўчириш')} onClick={() => confirm(t('Ёзув ўчирилсинми?')) && del.mutate(r.id)}><Trash2 size={15} /></Button>
                    </td>}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
      {edit && <RecordForm kind={kind} rec={edit === 'new' ? null : edit} onClose={() => setEdit(null)} />}
      {openId && <TicketDetail id={openId} onClose={closeView} />}
    </div>
  );
}
