import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Button, Field, Input, Modal } from '../../components/kit';
import { Empty, ErrorNote, Loading, PageHeader } from '../../components/ui';
import { api } from '../../lib/api';
import { useSearchParams } from 'react-router-dom';
import { useT } from '../../lib/script';
import { fmtD, fmtMin } from './config';
import { Badge, useJournalWrite, useOrgs, useSettings } from './JournalList';

function OrgHistory({ id, onClose }: { id: string; onClose: () => void }) {
  const t = useT();
  const h = useQuery({ queryKey: ['j-org', id], queryFn: () => api<any>(`/journal/orgs/${id}`) });
  const o = h.data;
  const mins = (o?.entries ?? []).reduce((s: number, e: any) => s + (e.durationMin ?? 0), 0);
  return (
    <Modal title={o?.name ?? t('Ташкилот')} onClose={onClose} wide>
      {!o ? <Loading /> : <div className="space-y-5">
        <p className="text-sm text-slate-500">{[t(o.region), o.group && `${t('Гуруҳ')} ${o.group}`, o.note].filter(Boolean).join(' · ') || '—'}</p>
        <div className="grid grid-cols-3 gap-3">
          {[[t('Мурожаатлар'), o.tickets.length, `${t('очиқ:')} ${o.tickets.filter((t: any) => !['Hal qilindi', 'Bekor qilindi'].includes(t.status)).length}`],
            [t('Бажарилган ишлар'), o.entries.length, mins ? t(fmtMin(mins)) : t('вақт киритилмаган')],
            [t('Ўқитишлар'), o.trainings.length, `${o.trainings.reduce((s: number, x: any) => s + x.count, 0)} ${t('фойдаланувчи')}`]].map(([l, n, s]) => (
            <div key={l as string} className="card p-3"><b className="block text-2xl">{n}</b><span className="text-xs text-slate-600">{l}</span><span className="block text-xs text-slate-400">{s}</span></div>))}
        </div>
        <div><h3 className="eyebrow mb-2">{t('Мурожаатлар')}</h3>{o.tickets.length === 0 ? <p className="text-sm text-slate-400">{t('Мурожаат йўқ.')}</p> :
          <table className="w-full text-left text-sm"><tbody className="divide-y">{o.tickets.slice(0, 8).map((t: any) => <tr key={t.id}><td className="py-1.5 pr-3 font-medium">{t.code}</td><td className="pr-3">{fmtD(t.received)}</td><td className="pr-3">{t.problem.slice(0, 70)}</td><td><Badge v={t.status} /></td></tr>)}</tbody></table>}</div>
      </div>}
    </Modal>
  );
}

function OrgForm({ rec, onClose }: { rec: any | null; onClose: () => void }) {
  const t = useT();
  const qc = useQueryClient(), groups = useSettings().data?.lists.groups ?? [];
  const [v, setV] = useState({ name: rec?.name ?? '', region: rec?.region ?? '', group: rec?.group ?? '', note: rec?.note ?? '' });
  const m = useMutation({
    mutationFn: () => api(`/journal/orgs${rec ? '/' + rec.id : ''}`, { method: rec ? 'PATCH' : 'POST', body: JSON.stringify(v) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['j-orgs'] }); onClose(); },
  });
  const submit = (e: FormEvent) => { e.preventDefault(); m.mutate(); };
  return (
    <Modal title={t(rec ? 'Ташкилотни таҳрирлаш' : 'Янги ташкилот')} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <Field label={t('Ташкилот номи *')}><Input value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} required /></Field>
        <Field label={t('Ҳудуд / туман')}><Input value={v.region} onChange={(e) => setV({ ...v, region: e.target.value })} /></Field>
        <Field label={t('Мижозлар гуруҳи')}><select className="h-9 w-full rounded-md border border-slate-200 bg-white px-2 text-sm" value={v.group} onChange={(e) => setV({ ...v, group: e.target.value })}><option value="" />{groups.map((g) => <option key={g} value={g}>{t(g)}</option>)}</select></Field>
        <Field label={t('Изоҳ')}><Input value={v.note} onChange={(e) => setV({ ...v, note: e.target.value })} /></Field>
        <ErrorNote error={m.error} />
        <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={onClose}>{t('Бекор қилиш')}</Button><Button type="submit" loading={m.isPending}>{t('Сақлаш')}</Button></div>
      </form>
    </Modal>
  );
}

export default function Orgs() {
  const t = useT(), [params, setParams] = useSearchParams();
  const write = useJournalWrite(), orgs = useOrgs();
  const [form, setForm] = useState<any | 'new' | null>(null), [view0, setView] = useState<string | null>(null), [q, setQ] = useState('');
  const view = params.get('open') ?? view0;
  const closeView = () => { setView(null); if (params.has('open')) { params.delete('open'); setParams(params, { replace: true }); } };
  const rows = (orgs.data ?? []).filter((o) => !q || (o.name + o.region).toLowerCase().includes(q.toLowerCase()));
  return (
    <div>
      <PageHeader title={t('Ташкилотлар')} hint={t('Ягона ташкилотлар рўйхати. Бошқа журналлар шу рўйхатга боғланади.')}>
        {write && <Button onClick={() => setForm('new')}><Plus size={16} />{t('Янги ташкилот')}</Button>}
      </PageHeader>
      <div className="mb-3 max-w-sm"><Input translit={false} placeholder={t('Қидириш…')} value={q} onChange={(e) => setQ(e.target.value)} /></div>
      <ErrorNote error={orgs.error} />
      {orgs.isLoading ? <Loading /> : <div className="card overflow-x-auto">{rows.length === 0 ? <Empty>{t('Ташкилот йўқ.')}</Empty> :
        <table className="w-full text-left"><thead className="border-b bg-slate-50"><tr>{['Номи', 'Ҳудуд', 'Гуруҳ', 'Мурожаат', 'Очиқ', 'Ишлар', 'Ўқитиш', ''].map((h) => <th key={h} className="th">{t(h)}</th>)}</tr></thead>
          <tbody className="divide-y">{rows.map((o) => (
            <tr key={o.id} className="hover:bg-slate-50/70">
              <td className="td"><button className="font-medium text-slate-900 hover:underline" onClick={() => setView(o.id)}>{o.name}</button></td>
              <td className="td">{t(o.region)}</td><td className="td">{t(o.group)}</td>
              <td className="td">{o.stats.tickets}</td><td className="td">{o.stats.open > 0 ? <Badge v="Yangi" /> : null}{o.stats.open || ''}</td>
              <td className="td">{o.stats.entries}</td><td className="td">{o.stats.trainings}</td>
              <td className="td text-right">{write && <Button variant="ghost" size="sm" onClick={() => setForm(o)}>{t('Таҳрирлаш')}</Button>}</td>
            </tr>))}</tbody></table>}</div>}
      {form && <OrgForm rec={form === 'new' ? null : form} onClose={() => setForm(null)} />}
      {view && <OrgHistory id={view} onClose={closeView} />}
    </div>
  );
}
