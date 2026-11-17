import { useMutation } from '@tanstack/react-query';
import { GitMerge, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button, Field, Input, Modal } from '../../components/kit';
import { Empty, ErrorNote, Loading, PageHeader } from '../../components/ui';
import { api } from '../../lib/api';
import { useT } from '../../lib/script';
import { useJournalWrite, useL, useOrgs, useRefresh } from './hooks';
import { useJournalLinks } from './JournalShell';
import type { Org } from './types';
import { OrgForm } from './ui/Forms';
import { Combobox } from './ui/Combobox';

/** Дубликат ташкилотни бирлаштириш: барча ёзувлар танланганига ўтади */
function MergeDialog({ org, all, onClose }: { org: Org; all: Org[]; onClose: () => void }) {
  const t = useT(), refresh = useRefresh(), [into, setInto] = useState<string | null>(null), [q, setQ] = useState('');
  const items = useMemo(() => all.filter((o) => o.id !== org.id && (!q || o.name.toLowerCase().includes(q.toLowerCase()))).slice(0, 30).map((o) => ({ id: o.id, label: o.name, hint: o.region })), [all, org.id, q]);
  const m = useMutation({ mutationFn: () => api(`/journal/orgs/${org.id}/merge`, { method: 'POST', body: JSON.stringify({ intoId: into }) }), onSuccess: async () => { await refresh(); onClose(); } });
  return (
    <Modal title={`${t('Бирлаштириш')}: ${org.name}`} onClose={onClose}>
      <div className="space-y-4">
        <p className="text-sm text-slate-600">{t('Бу ташкилотнинг барча ёзувлари (мурожаат, иш, ўқитиш) танланган ташкилотга ўтказилади, кейин бу ташкилот ўчирилади.')}</p>
        <Field label={t('Қайси ташкилотга қўшилсин?')}><Combobox value={into} items={items} onQuery={setQ} onSelect={setInto} placeholder={t('Ташкилот')} /></Field>
        <ErrorNote error={m.error} />
        <div className="flex justify-end gap-2"><Button variant="secondary" onClick={onClose}>{t('Бекор қилиш')}</Button><Button disabled={!into} loading={m.isPending} onClick={() => m.mutate()}>{t('Бирлаштириш')}</Button></div>
      </div>
    </Modal>
  );
}

export default function Orgs() {
  const t = useT(), l = useL(), write = useJournalWrite(), orgs = useOrgs(), { openOrg } = useJournalLinks();
  const [form, setForm] = useState<Org | 'new' | null>(null), [merge, setMerge] = useState<Org | null>(null), [q, setQ] = useState('');
  const rows = (orgs.data ?? []).filter((o) => !q || `${o.name} ${o.region}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="space-y-4">
      <PageHeader title={t('Ташкилотлар')} hint={t('Ягона ташкилотлар рўйхати. Бошқа журналлар шу рўйхатга боғланади, янгисини ёзув киритаётганда ҳам қўшиш мумкин.')}>
        {write && <Button onClick={() => setForm('new')}><Plus size={16} />{t('Янги ташкилот')}</Button>}
      </PageHeader>
      <div className="max-w-sm"><Input translit={false} placeholder={t('Қидириш…')} value={q} onChange={(e) => setQ(e.target.value)} /></div>
      <ErrorNote error={orgs.error} />
      {orgs.isLoading ? <Loading /> : (
        <div className="card overflow-x-auto">
          {rows.length === 0 ? <Empty>{t('Ташкилот йўқ.')}</Empty> : (
            <table className="w-full text-left">
              <thead className="border-b bg-slate-50"><tr>{['Номи', 'Ҳудуд', 'Гуруҳ', 'Мурожаат', 'Очиқ', 'Ишлар', 'Ўқитиш', ''].map((h) => <th key={h} className="th">{t(h)}</th>)}</tr></thead>
              <tbody className="divide-y">
                {rows.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-50/70">
                    <td className="td"><button className="text-left font-medium hover:underline" onClick={() => openOrg(o.id)}>{o.name}</button></td>
                    <td className="td">{o.region}</td><td className="td">{l(o.group)}</td>
                    <td className="td">{o.stats.tickets}</td>
                    <td className="td">{o.stats.open > 0 && <span className="rounded-md bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900">{o.stats.open}</span>}</td>
                    <td className="td">{o.stats.entries}</td><td className="td">{o.stats.trainings}</td>
                    <td className="td whitespace-nowrap text-right">{write && <>
                      <Button variant="ghost" size="sm" onClick={() => setForm(o)}>{t('Таҳрирлаш')}</Button>
                      <Button variant="ghost" size="icon" aria-label={t('Бирлаштириш')} title={t('Дубликатни бирлаштириш')} onClick={() => setMerge(o)}><GitMerge size={14} /></Button></>}</td>
                  </tr>))}
              </tbody>
            </table>)}
        </div>)}
      {form && <OrgForm org={form === 'new' ? null : form} onClose={() => setForm(null)} />}
      {merge && <MergeDialog org={merge} all={orgs.data ?? []} onClose={() => setMerge(null)} />}
    </div>
  );
}
