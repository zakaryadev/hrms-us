import { useMutation } from '@tanstack/react-query';
import { GitMerge, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button, Field, Modal } from '../../components/kit';
import DataTable, { actionBtn, iconBtn, type Column } from '../../components/DataTable';
import { ErrorNote, PageHeader } from '../../components/ui';
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
  const [form, setForm] = useState<Org | 'new' | null>(null), [merge, setMerge] = useState<Org | null>(null);
  const columns: Column<Org>[] = [
    { key: 'name', header: 'Номи', locked: true, minWidth: '14rem', value: (o) => o.name, cell: (o) => <button className="text-left font-medium hover:underline" onClick={() => openOrg(o.id)}>{o.name}</button> },
    { key: 'region', header: 'Ҳудуд', value: (o) => o.region },
    { key: 'group', header: 'Гуруҳ', value: (o) => l(o.group) },
    { key: 'tickets', header: 'Мурожаат', align: 'right', value: (o) => o.stats.tickets },
    { key: 'open', header: 'Очиқ', align: 'right', value: (o) => o.stats.open, cell: (o) => o.stats.open > 0 ? <span className="rounded-md bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900">{o.stats.open}</span> : null },
    { key: 'entries', header: 'Ишлар', align: 'right', value: (o) => o.stats.entries },
    { key: 'trainings', header: 'Ўқитиш', align: 'right', value: (o) => o.stats.trainings },
  ];
  return (
    <div className="space-y-4">
      <PageHeader title={t('Ташкилотлар')} hint={t('Ягона ташкилотлар рўйхати. Бошқа журналлар шу рўйхатга боғланади, янгисини ёзув киритаётганда ҳам қўшиш мумкин.')}>
        {write && <Button onClick={() => setForm('new')}><Plus size={16} />{t('Янги ташкилот')}</Button>}
      </PageHeader>
      <ErrorNote error={orgs.error} />
      <DataTable
        storageKey="j-orgs" columns={columns} rows={orgs.data} rowKey={(o) => o.id} loading={orgs.isLoading} t={t} initialPageSize={50}
        defaultSort={{ key: 'name', dir: 'asc' }} emptyText="Ташкилот йўқ." searchPlaceholder="Ном ёки ҳудуд бўйича қидириш"
        actions={write ? (o) => (<>
          <button type="button" className={actionBtn} onClick={() => setForm(o)}>{t('Таҳрирлаш')}</button>
          <button type="button" className={iconBtn} aria-label={t('Бирлаштириш')} title={t('Дубликатни бирлаштириш')} onClick={() => setMerge(o)}><GitMerge size={15} /></button></>) : undefined}
      />
      {form && <OrgForm org={form === 'new' ? null : form} onClose={() => setForm(null)} />}
      {merge && <MergeDialog org={merge} all={orgs.data ?? []} onClose={() => setMerge(null)} />}
    </div>
  );
}
