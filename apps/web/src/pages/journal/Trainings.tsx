import { useMutation, useQuery } from '@tanstack/react-query';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import DataTable, { iconBtn, type Column } from '../../components/DataTable';
import { Button, Checkbox } from '../../components/kit';
import { ErrorNote, PageHeader } from '../../components/ui';
import { api } from '../../lib/api';
import { useT } from '../../lib/script';
import { fmtD } from './labels';
import { useJournalWrite, useL, useRefresh, useTableState } from './hooks';
import { useJournalLinks } from './JournalShell';
import type { Training, TrainingList } from './types';
import { TrainingForm } from './ui/Forms';
import { MonthFilter } from './ui/MonthFilter';

export default function Trainings() {
  const t = useT(), l = useL(), write = useJournalWrite(), refresh = useRefresh(), { openTicket, openOrg } = useJournalLinks();
  const [month, setMonth] = useState(''), [mine, setMine] = useState(false), [edit, setEdit] = useState<Training | 'new' | null>(null);
  const tbl = useTableState('j-trainings', [month, mine]);
  const qs = tbl.query({ ...(month && { month }), ...(mine && { mine: 'true' }) });
  const list = useQuery({ queryKey: ['j', 'trainings', qs], queryFn: () => api<TrainingList>(`/journal/trainings?${qs}`), placeholderData: (prev) => prev });
  const del = useMutation({ mutationFn: (id: string) => api(`/journal/trainings/${id}`, { method: 'DELETE' }), onSuccess: refresh });
  const columns: Column<Training>[] = [
    { key: 'date', header: 'Сана', nowrap: true, locked: true, cell: (r) => fmtD(r.date) },
    { key: 'org', header: 'Ташкилот', minWidth: '10rem', cell: (r) => r.org && <button className="text-left hover:underline" onClick={() => openOrg(r.org!.id)}>{r.org.name}</button> },
    { key: 'topic', header: 'Мавзу', minWidth: '14rem', cell: (r) => <><div className="max-w-[22rem]">{r.topic}</div>{r.result && <p className="mt-0.5 text-xs text-slate-500">{r.result}</p>}</> },
    { key: 'format', header: 'Формат', cell: (r) => l(r.format) },
    { key: 'count', header: 'Иштирокчи', align: 'right', cell: (r) => r.count },
    { key: 'trainer', header: 'Ўтказувчи', cell: (r) => r.trainer },
    { key: 'ticket', header: 'Мурожаат', sortable: false, cell: (r) => r.ticket && <button className="font-medium hover:underline" onClick={() => openTicket(r.ticket!.id)}>{r.ticket.code}</button> },
  ];
  return (
    <div className="space-y-4">
      <PageHeader title={t('Ўқитиш')} hint={t('Ўқув машғулотлари ва якка тушунтиришлар.')}>
        {write && <Button onClick={() => setEdit('new')}><Plus size={16} />{t('Янги ўқитиш')}</Button>}
      </PageHeader>
      <ErrorNote error={list.error ?? del.error} />
      <DataTable
        storageKey="j-trainings" columns={columns} rows={list.data?.items} rowKey={(r) => r.id} loading={list.isLoading} t={t}
        manual={tbl.manual(list.data?.total ?? 0)} emptyText="Ёзув топилмади." searchPlaceholder="Мавзу, ўтказувчи, натижа бўйича қидириш"
        toolbar={<><MonthFilter value={month} onChange={setMonth} /><Checkbox checked={mine} onChange={setMine}>{t('Фақат меники')}</Checkbox>
          {list.data && <span className="text-sm text-slate-500">{list.data.participants} {t('иштирокчи')}</span>}</>}
        actions={write ? (r) => (<>
          <button type="button" className={iconBtn} aria-label={t('Таҳрирлаш')} title={t('Таҳрирлаш')} onClick={() => setEdit(r)}><Pencil size={15} /></button>
          <button type="button" className={iconBtn} aria-label={t('Ўчириш')} title={t('Ўчириш')} onClick={() => confirm(t('Ёзув ўчирилсинми?')) && del.mutate(r.id)}><Trash2 size={15} /></button></>) : undefined}
      />
      {edit && <TrainingForm training={edit === 'new' ? null : edit} onClose={() => setEdit(null)} />}
    </div>
  );
}
