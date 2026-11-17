import { useMutation, useQuery } from '@tanstack/react-query';
import { Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Button, Input } from '../../components/kit';
import { Empty, ErrorNote, Loading, PageHeader } from '../../components/ui';
import { api } from '../../lib/api';
import { useT } from '../../lib/script';
import { fmtD } from './labels';
import { useJournalWrite, useL, useRefresh } from './hooks';
import { useJournalLinks } from './JournalShell';
import type { Training, TrainingList } from './types';
import { TrainingForm } from './ui/Forms';

const selCls = 'h-9 rounded-md border border-slate-200 bg-white px-2 text-sm shadow-sm focus:outline-none focus:ring-[3px] focus:ring-slate-400/40';

export default function Trainings() {
  const t = useT(), l = useL(), write = useJournalWrite(), refresh = useRefresh(), { openTicket, openOrg } = useJournalLinks();
  const [q, setQ] = useState(''), [month, setMonth] = useState(''), [mine, setMine] = useState(false), [edit, setEdit] = useState<Training | 'new' | null>(null);
  const qs = new URLSearchParams({ pageSize: '100', ...(q && { q }), ...(month && { month }), ...(mine && { mine: 'true' }) });
  const list = useQuery({ queryKey: ['j', 'trainings', q, month, mine], queryFn: () => api<TrainingList>(`/journal/trainings?${qs}`) });
  const del = useMutation({ mutationFn: (id: string) => api(`/journal/trainings/${id}`, { method: 'DELETE' }), onSuccess: refresh });
  const rows = list.data?.items ?? [];
  return (
    <div className="space-y-4">
      <PageHeader title={t('Ўқитиш')} hint={t('Ўқув машғулотлари ва якка тушунтиришлар.')}>
        {write && <Button onClick={() => setEdit('new')}><Plus size={16} />{t('Янги ўқитиш')}</Button>}
      </PageHeader>
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[240px] flex-1 sm:max-w-sm"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><Input className="pl-9" translit={false} placeholder={t('Қидириш…')} value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <input type="month" className={selCls} value={month} onChange={(e) => setMonth(e.target.value)} aria-label={t('Ой')} />
        <label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={mine} onChange={(e) => setMine(e.target.checked)} />{t('Фақат меники')}</label>
        {list.data && <span className="ml-auto text-sm text-slate-500">{list.data.total} {t('та ёзув')} · {list.data.participants} {t('иштирокчи')}</span>}
      </div>
      <ErrorNote error={list.error ?? del.error} />
      {list.isLoading ? <Loading /> : (
        <div className="card overflow-x-auto">
          {rows.length === 0 ? <Empty>{t('Ёзув топилмади.')}</Empty> : (
            <table className="w-full text-left">
              <thead className="border-b bg-slate-50"><tr>{['Сана', 'Ташкилот', 'Мавзу', 'Формат', 'Иштирокчи', 'Ўтказувчи', 'Мурожаат', ''].map((h) => <th key={h} className="th">{t(h)}</th>)}</tr></thead>
              <tbody className="divide-y">
                {rows.map((r) => (
                  <tr key={r.id} className="align-top hover:bg-slate-50/70">
                    <td className="td whitespace-nowrap">{fmtD(r.date)}</td>
                    <td className="td">{r.org && <button className="text-left hover:underline" onClick={() => openOrg(r.org!.id)}>{r.org.name}</button>}</td>
                    <td className="td"><div className="max-w-[22rem]">{r.topic}</div>{r.result && <p className="mt-0.5 text-xs text-slate-500">{r.result}</p>}</td>
                    <td className="td">{l(r.format)}</td><td className="td">{r.count}</td><td className="td">{r.trainer}</td>
                    <td className="td">{r.ticket && <button className="font-medium hover:underline" onClick={() => openTicket(r.ticket!.id)}>{r.ticket.code}</button>}</td>
                    <td className="td whitespace-nowrap text-right">{write && <>
                      <Button variant="ghost" size="icon" aria-label={t('Таҳрирлаш')} onClick={() => setEdit(r)}><Pencil size={14} /></Button>
                      <Button variant="ghost" size="icon" aria-label={t('Ўчириш')} onClick={() => confirm(t('Ёзув ўчирилсинми?')) && del.mutate(r.id)}><Trash2 size={14} /></Button></>}</td>
                  </tr>))}
              </tbody>
            </table>)}
        </div>)}
      {edit && <TrainingForm training={edit === 'new' ? null : edit} onClose={() => setEdit(null)} />}
    </div>
  );
}
