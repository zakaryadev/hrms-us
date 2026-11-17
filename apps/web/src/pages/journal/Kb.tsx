import { useMutation, useQuery } from '@tanstack/react-query';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import DataTable, { iconBtn, type Column } from '../../components/DataTable';
import { Button, Tabs } from '../../components/kit';
import { ErrorNote, PageHeader } from '../../components/ui';
import { api } from '../../lib/api';
import { useScript, useT } from '../../lib/script';
import { fmtD, KB_STATUS, KB_STATUS_ORDER } from './labels';
import { useJournalWrite, useL, useRefresh, useTableState } from './hooks';
import { useJournalLinks } from './JournalShell';
import type { Kb as KbRow, KbStatus, Page } from './types';
import { KbForm } from './ui/Forms';
import { StatusChip } from './ui/StatusMenu';

export default function Kb() {
  const t = useT(), l = useL(), { script } = useScript(), write = useJournalWrite(), refresh = useRefresh(), { openTicket } = useJournalLinks();
  const [tab, setTab] = useState<'all' | KbStatus>('all'), [edit, setEdit] = useState<KbRow | 'new' | null>(null);
  const tbl = useTableState('j-kb', [tab]);
  const qs = tbl.query(tab !== 'all' ? { status: tab } : {});
  const list = useQuery({ queryKey: ['j', 'kb', qs], queryFn: () => api<Page<KbRow>>(`/journal/kb?${qs}`), placeholderData: (prev) => prev });
  const del = useMutation({ mutationFn: (id: string) => api(`/journal/kb/${id}`, { method: 'DELETE' }), onSuccess: refresh });
  const setStatus = useMutation({ mutationFn: (a: { id: string; status: KbStatus }) => api(`/journal/kb/${a.id}`, { method: 'PATCH', body: JSON.stringify({ status: a.status }) }), onSuccess: refresh });
  const tabs = [{ value: 'all' as const, label: t('Барчаси') }, ...KB_STATUS_ORDER.map((s) => ({ value: s, label: KB_STATUS[s][script] }))];
  const columns: Column<KbRow>[] = [
    { key: 'code', header: 'ID', locked: true, nowrap: true, cell: (r) => <span className="font-medium">{r.code}</span> },
    { key: 'created', header: 'Сана', nowrap: true, cell: (r) => fmtD(r.created) },
    { key: 'category', header: 'Категория', cell: (r) => l(r.category) },
    { key: 'type', header: 'Тури', cell: (r) => l(r.type) },
    { key: 'question', header: 'Савол', sortable: false, minWidth: '16rem', cell: (r) => <><div className="max-w-[26rem]">{r.question}</div>{r.review && <p className="mt-0.5 text-xs text-slate-500">{t('Қайта кўриш')}: {fmtD(r.review)}</p>}</> },
    { key: 'ticket', header: 'Манба', sortable: false, cell: (r) => r.ticket && <button className="font-medium hover:underline" onClick={() => openTicket(r.ticket!.id)}>{r.ticket.code}</button> },
    { key: 'version', header: 'Версия', hidden: true },
    { key: 'status', header: 'Ҳолат', nowrap: true, cell: (r) => <StatusChip value={r.status} defs={KB_STATUS} order={KB_STATUS_ORDER} onChange={write ? (s) => setStatus.mutate({ id: r.id, status: s }) : undefined} /> },
  ];
  return (
    <div className="space-y-4">
      <PageHeader title={t('Билимлар базаси')} hint={t('Саволлар, амалий ечимлар, қўлланмалар ва йўриқномалар ҳисоби. Ҳолатни рўйхатнинг ўзидан алмаштиринг.')}>
        {write && <Button onClick={() => setEdit('new')}><Plus size={16} />{t('Янги материал')}</Button>}
      </PageHeader>
      <Tabs items={tabs} value={tab} onChange={setTab} aria-label={t('Ҳолат')} />
      <ErrorNote error={list.error ?? del.error ?? setStatus.error} />
      <DataTable
        storageKey="j-kb" columns={columns} rows={list.data?.items} rowKey={(r) => r.id} loading={list.isLoading} t={t}
        manual={tbl.manual(list.data?.total ?? 0)} emptyText="Ёзув топилмади." searchPlaceholder="ID, савол, ечим бўйича қидириш"
        actions={write ? (r) => (<>
          <button type="button" className={iconBtn} aria-label={t('Таҳрирлаш')} title={t('Таҳрирлаш')} onClick={() => setEdit(r)}><Pencil size={15} /></button>
          <button type="button" className={iconBtn} aria-label={t('Ўчириш')} title={t('Ўчириш')} onClick={() => confirm(t('Ёзув ўчирилсинми?')) && del.mutate(r.id)}><Trash2 size={15} /></button></>) : undefined}
      />
      {edit && <KbForm kb={edit === 'new' ? null : edit} onClose={() => setEdit(null)} />}
    </div>
  );
}
