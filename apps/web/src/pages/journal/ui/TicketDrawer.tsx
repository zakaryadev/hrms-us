import { useMutation, useQuery } from '@tanstack/react-query';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button, Textarea } from '../../../components/kit';
import { Empty, ErrorNote, Loading } from '../../../components/ui';
import { api } from '../../../lib/api';
import { useT } from '../../../lib/script';
import { daysBetween, fmtD, fmtMin, KB_STATUS, TICKET_STATUS, TICKET_STATUS_ORDER, todayIso } from '../labels';
import { useJournalWrite, useL, useMeta, useRefresh } from '../hooks';
import { OPEN_STATUSES, type TicketDetail, type TicketStatus } from '../types';
import { Drawer } from './Drawer';
import { EntryComposer } from './EntryComposer';
import { KbForm, TicketForm, TrainingForm } from './Forms';
import { StatusChip } from './StatusMenu';

const Section = ({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) => (
  <section className="mt-6"><div className="mb-2 flex items-center justify-between"><h3 className="eyebrow">{title}</h3>{action}</div>{children}</section>
);
const Fact = ({ label, children }: { label: string; children: React.ReactNode }) => <div><p className="label !mb-0.5">{label}</p><div className="text-sm">{children || <span className="text-slate-400">—</span>}</div></div>;

/** Мурожаат тафсилоти: ҳолатни ўзгартириш, кўрилган чоралар (ўша жойда таҳрир), ишлар, материаллар, ўқитишлар, ҳолатлар тарихи */
export function TicketDrawer({ id, onClose, onOrg }: { id: string; onClose: () => void; onOrg: (orgId: string) => void }) {
  const t = useT(), l = useL(), write = useJournalWrite(), refresh = useRefresh();
  const norm = useMeta().data?.normDays ?? 0;
  const q = useQuery({ queryKey: ['j', 'ticket', id], queryFn: () => api<TicketDetail>(`/journal/tickets/${id}`) });
  const [edit, setEdit] = useState(false), [kb, setKb] = useState(false), [tr, setTr] = useState(false), [actions, setActions] = useState('');
  const d = q.data;
  useEffect(() => { if (d) setActions(d.actions); }, [d?.id, d?.actions]);   // eslint-disable-line react-hooks/exhaustive-deps

  const status = useMutation({ mutationFn: (s: TicketStatus) => api(`/journal/tickets/${id}/status`, { method: 'POST', body: JSON.stringify({ status: s }) }), onSuccess: refresh });
  const saveActions = useMutation({ mutationFn: () => api(`/journal/tickets/${id}`, { method: 'PATCH', body: JSON.stringify({ actions }) }), onSuccess: refresh });
  const del = useMutation({ mutationFn: () => api(`/journal/tickets/${id}`, { method: 'DELETE' }), onSuccess: async () => { await refresh(); onClose(); } });

  const age = d ? (OPEN_STATUSES.includes(d.status) ? daysBetween(d.received, todayIso()) : d.days) : null;
  const late = !!d && norm > 0 && OPEN_STATUSES.includes(d.status) && (age ?? 0) > norm;

  return (
    <>
      <Drawer onClose={onClose}
        title={d ? <span className="flex flex-wrap items-center gap-2">{d.code}<StatusChip size="md" value={d.status} defs={TICKET_STATUS} order={TICKET_STATUS_ORDER} onChange={write ? (s) => status.mutate(s) : undefined} /></span> : t('Мурожаат')}
        actions={d && write && <>
          <Button variant="ghost" size="icon" aria-label={t('Таҳрирлаш')} onClick={() => setEdit(true)}><Pencil size={15} /></Button>
          <Button variant="ghost" size="icon" aria-label={t('Ўчириш')} onClick={() => confirm(t('Мурожаат ўчирилсинми? Боғланган ишлар сақланади, фақат боғланиш узилади.')) && del.mutate()}><Trash2 size={15} /></Button>
        </>}>
        {!d ? <Loading rows={6} /> : (<>
          <ErrorNote error={status.error ?? saveActions.error ?? del.error} />
          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            <Fact label={t('Ташкилот')}>{d.org && <button className="text-left font-medium hover:underline" onClick={() => onOrg(d.org!.id)}>{d.org.name}{d.org.region && <span className="block text-xs font-normal text-slate-500">{d.org.region}</span>}</button>}</Fact>
            <Fact label={t('Қабул қилинган')}>{fmtD(d.received)}</Fact>
            <Fact label={t('Категория')}>{l(d.category)}</Fact>
            <Fact label={d.resolvedAt ? t('Ҳал этилган') : t('Муддат')}>{d.resolvedAt ? `${fmtD(d.resolvedAt)} (${d.days} ${t('кун')})` : age != null && <span className={late ? 'font-semibold text-red-600' : ''}>{age} {t('кун')}{late && ` · ${t('меъёр')} ${norm}`}</span>}</Fact>
            <Fact label={t('Устуворлик')}>{l(d.priority)}</Fact>
            <Fact label={t('Канал')}>{l(d.channel)}</Fact>
            <Fact label={t('Мурожаатчи')}>{d.person}</Fact>
            <Fact label={t('Йўналтирилган бўлим')}>{d.dept}</Fact>
          </div>
          <Section title={t('Муаммо тавсифи')}><p className="whitespace-pre-wrap text-sm">{d.problem}</p></Section>
          <Section title={t('Кўрилган чоралар')}>
            {write ? <Textarea translit={false} rows={3} value={actions} placeholder={t('Нима қилинганини ёзинг — фокус чиқса, автоматик сақланади')} onChange={(e) => setActions(e.target.value)} onBlur={() => actions !== d.actions && saveActions.mutate()} />
              : <p className="whitespace-pre-wrap text-sm">{d.actions || '—'}</p>}
          </Section>

          <Section title={`${t('Бажарилган ишлар')} · ${d.entries.length}${d.minutes ? ` · ${t(fmtMin(d.minutes))}` : ''}`}>
            {write && <div className="mb-3"><EntryComposer compact preset={{ ticketId: d.id, ticketCode: d.code, orgId: d.orgId }} /></div>}
            {d.entries.length === 0 ? <p className="text-sm text-slate-400">{t('Бу мурожаатга ҳали иш боғланмаган.')}</p> :
              <ul className="divide-y rounded-lg border">{d.entries.map((e) => (
                <li key={e.id} className="flex gap-3 px-3 py-2 text-sm"><span className="w-[84px] shrink-0 text-slate-500">{fmtD(e.date)}</span><span className="min-w-0 flex-1">{e.type && <b className="mr-1.5 font-medium">{l(e.type)}</b>}{e.done}</span>{e.durationMin != null && <span className="shrink-0 text-xs text-slate-500">{e.durationMin} {t('дақ.')}</span>}</li>))}</ul>}
          </Section>

          <Section title={`${t('Билимлар базаси')} · ${d.kb.length}`} action={write && <Button size="sm" variant="secondary" onClick={() => setKb(true)}><Plus size={13} />{t('Материал')}</Button>}>
            {d.kb.length === 0 ? <p className="text-sm text-slate-400">{t('Бу мурожаатдан материал яратилмаган.')}</p> :
              <ul className="divide-y rounded-lg border">{d.kb.map((k) => <li key={k.id} className="flex items-center gap-3 px-3 py-2 text-sm"><b className="shrink-0 font-medium">{k.code}</b><span className="min-w-0 flex-1">{k.question}</span><StatusChip value={k.status} defs={KB_STATUS} order={[k.status]} /></li>)}</ul>}
          </Section>

          <Section title={`${t('Ўқитишлар')} · ${d.trainings.length}`} action={write && <Button size="sm" variant="secondary" onClick={() => setTr(true)}><Plus size={13} />{t('Ўқитиш')}</Button>}>
            {d.trainings.length === 0 ? <p className="text-sm text-slate-400">{t('Бу мурожаат сабаб бўлган ўқитиш йўқ.')}</p> :
              <ul className="divide-y rounded-lg border">{d.trainings.map((r) => <li key={r.id} className="flex gap-3 px-3 py-2 text-sm"><span className="w-[84px] shrink-0 text-slate-500">{fmtD(r.date)}</span><span className="min-w-0 flex-1">{r.topic}</span><span className="text-xs text-slate-500">{r.count}</span></li>)}</ul>}
          </Section>

          <Section title={t('Ҳолатлар тарихи')}>
            <ol className="relative space-y-3 border-l border-slate-200 pl-4">{[...d.events].reverse().map((e) => (
              <li key={e.id} className="text-sm"><span className="absolute -left-[5px] mt-1.5 h-2.5 w-2.5 rounded-full bg-slate-300" />
                <StatusChip value={e.status} defs={TICKET_STATUS} order={[e.status]} />
                <span className="ml-2 text-xs text-slate-500">{new Date(e.at).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' })}{e.by && ` · ${e.by}`}</span>
                {e.note && <p className="mt-0.5 text-slate-600">{e.note}</p>}</li>))}</ol>
          </Section>
          {d.events.length === 0 && <Empty>—</Empty>}
        </>)}
      </Drawer>
      {edit && d && <TicketForm ticket={d} onClose={() => setEdit(false)} />}
      {kb && d && <KbForm kb={null} preset={{ ticketId: d.id, categoryId: d.categoryId, question: d.problem }} onClose={() => setKb(false)} />}
      {tr && d && <TrainingForm training={null} preset={{ ticketId: d.id, orgId: d.orgId }} onClose={() => setTr(false)} />}
    </>
  );
}
