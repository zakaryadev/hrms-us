import { useMutation, useQuery } from '@tanstack/react-query';
import { Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Button, Input, Tabs } from '../../components/kit';
import { Empty, ErrorNote, Loading, PageHeader } from '../../components/ui';
import { api } from '../../lib/api';
import { useScript, useT } from '../../lib/script';
import { fmtD, KB_STATUS, KB_STATUS_ORDER } from './labels';
import { useJournalWrite, useL, useRefresh } from './hooks';
import { useJournalLinks } from './JournalShell';
import type { Kb as KbRow, KbStatus, Page } from './types';
import { KbForm } from './ui/Forms';
import { StatusChip } from './ui/StatusMenu';

export default function Kb() {
  const t = useT(), l = useL(), { script } = useScript(), write = useJournalWrite(), refresh = useRefresh(), { openTicket } = useJournalLinks();
  const [q, setQ] = useState(''), [tab, setTab] = useState<'all' | KbStatus>('all'), [edit, setEdit] = useState<KbRow | 'new' | null>(null);
  const qs = new URLSearchParams({ pageSize: '100', ...(q && { q }), ...(tab !== 'all' && { status: tab }) });
  const list = useQuery({ queryKey: ['j', 'kb', q, tab], queryFn: () => api<Page<KbRow>>(`/journal/kb?${qs}`) });
  const del = useMutation({ mutationFn: (id: string) => api(`/journal/kb/${id}`, { method: 'DELETE' }), onSuccess: refresh });
  const setStatus = useMutation({ mutationFn: (a: { id: string; status: KbStatus }) => api(`/journal/kb/${a.id}`, { method: 'PATCH', body: JSON.stringify({ status: a.status }) }), onSuccess: refresh });
  const rows = list.data?.items ?? [];
  const tabs = [{ value: 'all' as const, label: t('Барчаси') }, ...KB_STATUS_ORDER.map((s) => ({ value: s, label: KB_STATUS[s][script] }))];
  return (
    <div className="space-y-4">
      <PageHeader title={t('Билимлар базаси')} hint={t('Саволлар, амалий ечимлар, қўлланмалар ва йўриқномалар ҳисоби. Ҳолатни рўйхатнинг ўзидан алмаштиринг.')}>
        {write && <Button onClick={() => setEdit('new')}><Plus size={16} />{t('Янги материал')}</Button>}
      </PageHeader>
      <Tabs items={tabs} value={tab} onChange={setTab} aria-label={t('Ҳолат')} />
      <div className="relative max-w-sm"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><Input className="pl-9" translit={false} placeholder={t('Қидириш…')} value={q} onChange={(e) => setQ(e.target.value)} /></div>
      <ErrorNote error={list.error ?? del.error ?? setStatus.error} />
      {list.isLoading ? <Loading /> : (
        <div className="card overflow-x-auto">
          {rows.length === 0 ? <Empty>{t('Ёзув топилмади.')}</Empty> : (
            <table className="w-full text-left">
              <thead className="border-b bg-slate-50"><tr>{['ID', 'Сана', 'Категория', 'Тури', 'Савол', 'Манба', 'Версия', 'Ҳолат', ''].map((h) => <th key={h} className="th">{t(h)}</th>)}</tr></thead>
              <tbody className="divide-y">
                {rows.map((r) => (
                  <tr key={r.id} className="align-top hover:bg-slate-50/70">
                    <td className="td whitespace-nowrap font-medium">{r.code}</td><td className="td whitespace-nowrap">{fmtD(r.created)}</td>
                    <td className="td">{l(r.category)}</td><td className="td">{l(r.type)}</td>
                    <td className="td"><div className="max-w-[26rem]">{r.question}</div>{r.review && <p className="mt-0.5 text-xs text-slate-500">{t('Қайта кўриш')}: {fmtD(r.review)}</p>}</td>
                    <td className="td">{r.ticket && <button className="font-medium hover:underline" onClick={() => openTicket(r.ticket!.id)}>{r.ticket.code}</button>}</td>
                    <td className="td">{r.version}</td>
                    <td className="td"><StatusChip value={r.status} defs={KB_STATUS} order={KB_STATUS_ORDER} onChange={write ? (s) => setStatus.mutate({ id: r.id, status: s }) : undefined} /></td>
                    <td className="td whitespace-nowrap text-right">{write && <>
                      <Button variant="ghost" size="icon" aria-label={t('Таҳрирлаш')} onClick={() => setEdit(r)}><Pencil size={14} /></Button>
                      <Button variant="ghost" size="icon" aria-label={t('Ўчириш')} onClick={() => confirm(t('Ёзув ўчирилсинми?')) && del.mutate(r.id)}><Trash2 size={14} /></Button></>}</td>
                  </tr>))}
              </tbody>
            </table>)}
        </div>)}
      {edit && <KbForm kb={edit === 'new' ? null : edit} onClose={() => setEdit(null)} />}
    </div>
  );
}
