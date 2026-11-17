import { useMutation, useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import DataTable, { type Column } from '../../components/DataTable';
import { Button, Checkbox, Input, Tabs, cn } from '../../components/kit';
import { ErrorNote, PageHeader } from '../../components/ui';
import { api } from '../../lib/api';
import { useScript, useT } from '../../lib/script';
import { daysBetween, fmtD, priorityTone, TICKET_STATUS, TICKET_STATUS_ORDER, TONE, todayIso } from './labels';
import { useJournalWrite, useL, useMeta, useRefresh, useTableState } from './hooks';
import { useJournalLinks } from './JournalShell';
import { OPEN_STATUSES, type Ticket, type TicketList, type TicketStatus } from './types';
import { TicketForm } from './ui/Forms';
import { MonthFilter } from './ui/MonthFilter';
import { OptionSelect, OrgPicker } from './ui/Pickers';
import { StatusChip } from './ui/StatusMenu';

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

/** Техник мурожаатлар: ҳолат табларида сонлар, ҳолатни рўйхатнинг ўзида ўзгартириш, қатор босилса — тафсилот панели */
export default function Tickets() {
  const t = useT(), l = useL(), { script } = useScript(), write = useJournalWrite(), refresh = useRefresh(), { openTicket, openOrg } = useJournalLinks();
  const meta = useMeta().data, norm = meta?.normDays ?? 0;
  const [tab, setTab] = useState<'all' | TicketStatus | 'open'>('open'), [month, setMonth] = useState(''), [mine, setMine] = useState(false), [form, setForm] = useState(false);
  const tbl = useTableState('j-tickets', [tab, month, mine]);
  const qs = tbl.query({ ...(month && { month }), ...(mine && { mine: 'true' }), ...(tab === 'open' ? { open: 'true' } : tab !== 'all' ? { status: tab } : {}) });
  const list = useQuery({ queryKey: ['j', 'tickets', qs], queryFn: () => api<TicketList>(`/journal/tickets?${qs}`), placeholderData: (prev) => prev });
  const setStatus = useMutation({ mutationFn: (a: { id: string; status: TicketStatus }) => api(`/journal/tickets/${a.id}/status`, { method: 'POST', body: JSON.stringify({ status: a.status }) }), onSuccess: refresh });
  const counts = list.data?.counts;
  const openCount = counts ? OPEN_STATUSES.reduce((s, k) => s + counts[k], 0) : 0;
  const priorities = meta?.options.priority.filter((p) => p.active) ?? [];

  const tabs = [
    { value: 'open' as const, label: <>{t('Очиқ')}{counts && <span className="ml-1.5 text-slate-400">{openCount}</span>}</> },
    ...TICKET_STATUS_ORDER.map((s) => ({ value: s, label: <>{TICKET_STATUS[s][script]}{counts && <span className="ml-1.5 text-slate-400">{counts[s]}</span>}</> })),
    { value: 'all' as const, label: <>{t('Барчаси')}{counts && <span className="ml-1.5 text-slate-400">{Object.values(counts).reduce((a, b) => a + b, 0)}</span>}</> },
  ];
  const columns: Column<Ticket>[] = [
    { key: 'code', header: 'ID', locked: true, nowrap: true, cell: (r) => <span className="font-medium">{r.code}</span> },
    { key: 'received', header: 'Қабул', nowrap: true, cell: (r) => fmtD(r.received) },
    { key: 'org', header: 'Ташкилот', minWidth: '10rem', cell: (r) => r.org ? <button className="text-left hover:underline" onClick={(e) => { e.stopPropagation(); openOrg(r.org!.id); }}>{r.org.name}</button> : <span className="text-slate-400">—</span> },
    { key: 'category', header: 'Категория', cell: (r) => l(r.category) },
    { key: 'problem', header: 'Муаммо', sortable: false, minWidth: '14rem', cell: (r) => <div className="line-clamp-2 max-w-[24rem]">{r.problem}</div> },
    { key: 'priority', header: 'Устуворлик', nowrap: true, cell: (r) => { const i = priorities.findIndex((p) => p.id === r.priorityId); return r.priority ? <span className={cn('inline-flex whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium', TONE[priorityTone(i < 0 ? 0 : i, priorities.length)])}>{l(r.priority)}</span> : null; } },
    { key: 'status', header: 'Ҳолат', nowrap: true, cell: (r) => <StatusChip value={r.status} defs={TICKET_STATUS} order={TICKET_STATUS_ORDER} onChange={write ? (s) => setStatus.mutate({ id: r.id, status: s }) : undefined} /> },
    { key: 'age', header: 'Муддат', sortable: false, nowrap: true, cell: (r) => {
      const open = OPEN_STATUSES.includes(r.status), age = open ? daysBetween(r.received, todayIso()) : r.days;
      return age == null ? null : <span className={cn(open && norm > 0 && age > norm && 'font-semibold text-red-600')}>{age} {t('кун')}</span>;
    } },
  ];

  return (
    <div className="space-y-4">
      <PageHeader title={t('Техник мурожаатлар')} hint={t('Мурожаатни рўйхатга олишдан якуний натижагача кузатув. Ҳолатни рўйхатнинг ўзидан ўзгартиринг, батафсил — қаторни босинг.')}>
        {write && <Button variant="secondary" onClick={() => setForm(true)}>{t('Батафсил қўшиш')}</Button>}
      </PageHeader>
      {write && <QuickAdd />}
      <Tabs items={tabs} value={tab} onChange={setTab} aria-label={t('Ҳолат')} />
      <ErrorNote error={list.error ?? setStatus.error} />
      <DataTable
        storageKey="j-tickets" columns={columns} rows={list.data?.items} rowKey={(r) => r.id} loading={list.isLoading} t={t}
        manual={tbl.manual(list.data?.total ?? 0)} onRowClick={(r) => openTicket(r.id)} emptyText="Ёзув топилмади."
        searchPlaceholder="ID, муаммо, ташкилот бўйича қидириш"
        toolbar={<><MonthFilter value={month} onChange={setMonth} /><Checkbox checked={mine} onChange={setMine}>{t('Фақат меники')}</Checkbox></>}
      />
      {form && <TicketForm ticket={null} onClose={() => setForm(false)} onSaved={(r) => openTicket(r.id)} />}
    </div>
  );
}
