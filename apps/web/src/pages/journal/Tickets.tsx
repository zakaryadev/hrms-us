import { useMutation, useQuery } from '@tanstack/react-query';
import { Plus, Search } from 'lucide-react';
import { useState } from 'react';
import { Button, Input, Tabs, cn } from '../../components/kit';
import { Empty, ErrorNote, Loading, PageHeader } from '../../components/ui';
import { api } from '../../lib/api';
import { useScript, useT } from '../../lib/script';
import { daysBetween, fmtD, priorityTone, TICKET_STATUS, TICKET_STATUS_ORDER, TONE, todayIso } from './labels';
import { useJournalWrite, useL, useMeta, useRefresh } from './hooks';
import { useJournalLinks } from './JournalShell';
import { OPEN_STATUSES, type Ticket, type TicketList, type TicketStatus } from './types';
import { TicketForm } from './ui/Forms';
import { OptionSelect, OrgPicker } from './ui/Pickers';
import { StatusChip } from './ui/StatusMenu';

const selCls = 'h-9 rounded-md border border-slate-200 bg-white px-2 text-sm shadow-sm focus:outline-none focus:ring-[3px] focus:ring-slate-400/40';

/** Тез қўшиш: ташкилот + муаммо + категория + устуворлик, Enter. Қолган майдонлар — мурожаат панелида. */
function QuickAdd() {
  const t = useT(), refresh = useRefresh(), { openTicket } = useJournalLinks();
  const [v, setV] = useState({ orgId: null as string | null, problem: '', categoryId: null as string | null, priorityId: null as string | null });
  const m = useMutation({
    mutationFn: () => api<Ticket>('/journal/tickets', { method: 'POST', body: JSON.stringify({ ...v, received: todayIso() }) }),
    onSuccess: async (r) => { await refresh(); setV((p) => ({ ...p, problem: '' })); openTicket(r.id); },
  });
  const submit = () => v.problem.trim() && !m.isPending && m.mutate();
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <OrgPicker value={v.orgId} onChange={(id) => setV((p) => ({ ...p, orgId: id }))} className="w-[240px]" />
        <Input translit={false} className="min-w-[260px] flex-1" value={v.problem} placeholder={t('Муаммо қисқача… (Enter — қўшиш)')} aria-label={t('Муаммо тавсифи')}
          onChange={(e) => setV((p) => ({ ...p, problem: e.target.value }))} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), submit())} />
        <OptionSelect kind="category" value={v.categoryId} onChange={(id) => setV((p) => ({ ...p, categoryId: id }))} placeholder={t('Категория')} className="w-[180px]" />
        <OptionSelect kind="priority" value={v.priorityId} onChange={(id) => setV((p) => ({ ...p, priorityId: id }))} placeholder={t('Устуворлик')} className="w-[150px]" />
        <Button onClick={submit} loading={m.isPending} disabled={!v.problem.trim()}><Plus size={16} />{t('Қўшиш')}</Button>
      </div>
      <ErrorNote error={m.error} />
    </div>
  );
}

/** Техник мурожаатлар: ҳолат табларида сонлар, ҳолатни бир босишда ўзгартириш, қатор босилса — тафсилот панели */
export default function Tickets() {
  const t = useT(), l = useL(), { script } = useScript(), write = useJournalWrite(), refresh = useRefresh(), { openTicket, openOrg } = useJournalLinks();
  const meta = useMeta().data, norm = meta?.normDays ?? 0;
  const [tab, setTab] = useState<'all' | TicketStatus | 'open'>('open'), [q, setQ] = useState(''), [month, setMonth] = useState(''), [mine, setMine] = useState(false), [form, setForm] = useState(false);
  const qs = new URLSearchParams({ pageSize: '100', ...(q && { q }), ...(month && { month }), ...(mine && { mine: 'true' }), ...(tab === 'open' ? { open: 'true' } : tab !== 'all' ? { status: tab } : {}) });
  const list = useQuery({ queryKey: ['j', 'tickets', tab, q, month, mine], queryFn: () => api<TicketList>(`/journal/tickets?${qs}`) });
  const setStatus = useMutation({ mutationFn: (a: { id: string; status: TicketStatus }) => api(`/journal/tickets/${a.id}/status`, { method: 'POST', body: JSON.stringify({ status: a.status }) }), onSuccess: refresh });
  const counts = list.data?.counts;
  const openCount = counts ? OPEN_STATUSES.reduce((s, k) => s + counts[k], 0) : 0;
  const total = counts ? Object.values(counts).reduce((a, b) => a + b, 0) : 0;
  const priorities = meta?.options.priority.filter((p) => p.active) ?? [];
  const rows = list.data?.items ?? [];

  const tabs = [
    { value: 'open' as const, label: <>{t('Очиқ')}{counts && <span className="ml-1.5 text-slate-400">{openCount}</span>}</> },
    ...TICKET_STATUS_ORDER.map((s) => ({ value: s, label: <>{TICKET_STATUS[s][script]}{counts && <span className="ml-1.5 text-slate-400">{counts[s]}</span>}</> })),
    { value: 'all' as const, label: <>{t('Барчаси')}{counts && <span className="ml-1.5 text-slate-400">{total}</span>}</> },
  ];

  return (
    <div className="space-y-4">
      <PageHeader title={t('Техник мурожаатлар')} hint={t('Мурожаатни рўйхатга олишдан якуний натижагача кузатув. Ҳолатни рўйхатнинг ўзидан ўзгартиринг, батафсил — қаторни босинг.')}>
        {write && <Button variant="secondary" onClick={() => setForm(true)}>{t('Батафсил қўшиш')}</Button>}
      </PageHeader>
      {write && <QuickAdd />}
      <Tabs items={tabs} value={tab} onChange={setTab} aria-label={t('Ҳолат')} />
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[240px] flex-1 sm:max-w-sm"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><Input className="pl-9" translit={false} placeholder={t('Қидириш…')} value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <input type="month" className={selCls} value={month} onChange={(e) => setMonth(e.target.value)} aria-label={t('Ой')} />
        <label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={mine} onChange={(e) => setMine(e.target.checked)} />{t('Фақат меники')}</label>
        {list.data && <span className="ml-auto text-sm text-slate-500">{list.data.total} {t('та ёзув')}</span>}
      </div>
      <ErrorNote error={list.error ?? setStatus.error} />
      {list.isLoading ? <Loading /> : (
        <div className="card overflow-x-auto">
          {rows.length === 0 ? <Empty>{t('Ёзув топилмади.')}</Empty> : (
            <table className="w-full text-left">
              <thead className="border-b bg-slate-50"><tr>{['ID', 'Қабул', 'Ташкилот', 'Категория', 'Муаммо', 'Устуворлик', 'Ҳолат', 'Муддат'].map((h) => <th key={h} className="th">{t(h)}</th>)}</tr></thead>
              <tbody className="divide-y">
                {rows.map((r) => {
                  const open = OPEN_STATUSES.includes(r.status), age = open ? daysBetween(r.received, todayIso()) : r.days, late = open && norm > 0 && (age ?? 0) > norm;
                  const pIdx = priorities.findIndex((p) => p.id === r.priorityId);
                  return (
                    <tr key={r.id} onClick={() => openTicket(r.id)} className="cursor-pointer align-top hover:bg-slate-50/70">
                      <td className="td whitespace-nowrap font-medium">{r.code}</td>
                      <td className="td whitespace-nowrap">{fmtD(r.received)}</td>
                      <td className="td">{r.org ? <button className="text-left hover:underline" onClick={(e) => { e.stopPropagation(); openOrg(r.org!.id); }}>{r.org.name}</button> : <span className="text-slate-400">—</span>}</td>
                      <td className="td">{l(r.category)}</td>
                      <td className="td"><div className="line-clamp-2 max-w-[24rem]">{r.problem}</div></td>
                      <td className="td">{r.priority && <span className={cn('inline-flex whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium', TONE[priorityTone(pIdx < 0 ? 0 : pIdx, priorities.length)])}>{l(r.priority)}</span>}</td>
                      <td className="td"><StatusChip value={r.status} defs={TICKET_STATUS} order={TICKET_STATUS_ORDER} onChange={write ? (s) => setStatus.mutate({ id: r.id, status: s }) : undefined} /></td>
                      <td className={cn('td whitespace-nowrap', late && 'font-semibold text-red-600')}>{age == null ? '' : `${age} ${t('кун')}`}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
      {form && <TicketForm ticket={null} onClose={() => setForm(false)} onSaved={(r) => openTicket(r.id)} />}
    </div>
  );
}
