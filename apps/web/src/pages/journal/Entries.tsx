import { useMutation, useQuery } from '@tanstack/react-query';
import { Pencil, Search, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Input } from '../../components/kit';
import { Button } from '../../components/kit';
import { Empty, ErrorNote, Loading, PageHeader } from '../../components/ui';
import { api } from '../../lib/api';
import { useT } from '../../lib/script';
import { fmtD, fmtMin, todayIso, weekdayOf } from './labels';
import { useJournalWrite, useL, useRefresh } from './hooks';
import { useJournalLinks } from './JournalShell';
import type { Entry, EntryList } from './types';
import { EntryComposer } from './ui/EntryComposer';

const selCls = 'h-9 rounded-md border border-slate-200 bg-white px-2 text-sm shadow-sm focus:outline-none focus:ring-[3px] focus:ring-slate-400/40';

/** Кундалик журнал: тез киритиш + кунлар бўйича гуруҳланган рўйхат (ҳар кунга иш сони ва жами вақт) */
export default function Entries() {
  const t = useT(), l = useL(), write = useJournalWrite(), refresh = useRefresh(), { openTicket, openOrg } = useJournalLinks();
  const [q, setQ] = useState(''), [month, setMonth] = useState(''), [mine, setMine] = useState(false);
  const [editing, setEditing] = useState<Entry | null>(null);
  const qs = new URLSearchParams({ pageSize: '100', ...(q && { q }), ...(month && { month }), ...(mine && { mine: 'true' }) });
  const list = useQuery({ queryKey: ['j', 'entries', q, month, mine], queryFn: () => api<EntryList>(`/journal/entries?${qs}`) });
  const del = useMutation({ mutationFn: (id: string) => api(`/journal/entries/${id}`, { method: 'DELETE' }), onSuccess: refresh });

  const days = useMemo(() => {
    const g = new Map<string, Entry[]>();
    for (const e of list.data?.items ?? []) g.set(e.date, [...(g.get(e.date) ?? []), e]);
    return [...g];
  }, [list.data]);
  const today = todayIso();

  return (
    <div className="space-y-4">
      <PageHeader title={t('Кундалик журнал')} hint={t('Ҳар бир бажарилган ишни алоҳида қайд этинг. Давомийлик автоматик ҳисобланади.')} />
      {write && <EntryComposer editing={editing} onDone={() => setEditing(null)} />}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[240px] flex-1 sm:max-w-sm"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><Input className="pl-9" translit={false} placeholder={t('Қидириш…')} value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <input type="month" className={selCls} value={month} onChange={(e) => setMonth(e.target.value)} aria-label={t('Ой')} />
        <label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={mine} onChange={(e) => setMine(e.target.checked)} />{t('Фақат меники')}</label>
        {list.data && <span className="ml-auto text-sm text-slate-500">{list.data.total} {t('та ёзув')}{list.data.minutes > 0 && ` · ${t(fmtMin(list.data.minutes))}`}</span>}
      </div>
      <ErrorNote error={list.error ?? del.error} />
      {list.isLoading ? <Loading /> : days.length === 0 ? <div className="card"><Empty>{t('Ёзув топилмади.')}</Empty></div> : (
        <div className="space-y-4">
          {days.map(([date, rows]) => {
            const mins = rows.reduce((s, e) => s + (e.durationMin ?? 0), 0);
            return (
              <section key={date} className="card overflow-hidden">
                <header className="flex items-center gap-3 border-b bg-slate-50 px-4 py-2 text-sm">
                  <b className="font-semibold">{fmtD(date)}</b><span className="text-slate-500">{t(weekdayOf(date))}</span>{date === today && <span className="rounded bg-slate-900 px-1.5 py-0.5 text-[11px] font-medium text-white">{t('Бугун')}</span>}
                  <span className="ml-auto text-slate-500">{rows.length} {t('иш')}{mins > 0 && ` · ${t(fmtMin(mins))}`}</span>
                </header>
                <ul className="divide-y">
                  {rows.map((e) => (
                    <li key={e.id} className="group grid grid-cols-[96px_1fr_auto] gap-x-4 px-4 py-3 text-sm hover:bg-slate-50/60 max-sm:grid-cols-1">
                      <div className="text-slate-500">{e.start ? <>{e.start}{e.end && ` – ${e.end}`}</> : '—'}{e.durationMin != null && <span className="block text-xs">{e.durationMin} {t('дақ.')}</span>}</div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                          {e.type && <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">{l(e.type)}</span>}
                          {e.org && <button className="font-medium hover:underline" onClick={() => openOrg(e.org!.id)}>{e.org.name}</button>}
                          {e.ticket && <button className="rounded border border-slate-200 px-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100" onClick={() => openTicket(e.ticket!.id)}>{e.ticket.code}</button>}
                          {e.person && <span className="text-slate-500">· {e.person}</span>}
                        </div>
                        <p className="mt-1 whitespace-pre-wrap">{e.done}</p>
                        {e.result && <p className="mt-0.5 text-slate-500">→ {e.result}</p>}
                      </div>
                      {write && <div className="flex items-start gap-0.5 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100 max-sm:opacity-100">
                        <Button variant="ghost" size="icon" aria-label={t('Таҳрирлаш')} onClick={() => { setEditing(e); window.scrollTo({ top: 0, behavior: 'smooth' }); }}><Pencil size={14} /></Button>
                        <Button variant="ghost" size="icon" aria-label={t('Ўчириш')} onClick={() => confirm(t('Ёзув ўчирилсинми?')) && del.mutate(e.id)}><Trash2 size={14} /></Button>
                      </div>}
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
