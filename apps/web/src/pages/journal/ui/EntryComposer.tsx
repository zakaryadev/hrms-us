import { useMutation } from '@tanstack/react-query';
import { Check, ChevronDown, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button, DatePicker, Input, Textarea, cn } from '../../../components/kit';
import { ErrorNote } from '../../../components/ui';
import { api } from '../../../lib/api';
import { useT } from '../../../lib/script';
import { fmtMin, todayIso } from '../labels';
import { useRefresh } from '../hooks';
import type { Entry } from '../types';
import { OptionSelect, OrgPicker, TicketPicker } from './Pickers';

const minutes = (start: string, end: string) => {
  if (!start || !end) return null;
  const m = (x: string) => { const [h, mm] = x.split(':').map(Number); return h * 60 + mm; };
  return (((m(end) - m(start)) % 1440) + 1440) % 1440;
};
const timeCls = 'h-9 w-[104px] rounded-md border border-slate-200 bg-white px-2 text-sm shadow-sm focus:border-slate-400 focus:outline-none focus:ring-[3px] focus:ring-slate-400/40';

/**
 * Тез киритиш: бир қаторда сана/вақт/иш тури/ташкилот/мурожаат + бажарилган иш. Ctrl+Enter — сақлаш.
 * Қўшимча майдонлар (мурожаатчи, канал, натижа) «Батафсил» остида. `editing` берилса — таҳрирлаш режими.
 */
export function EntryComposer({ editing, preset, onDone, compact }: { editing?: Entry | null; preset?: { ticketId?: string; ticketCode?: string; orgId?: string | null }; onDone?: () => void; compact?: boolean }) {
  const t = useT(), refresh = useRefresh();
  const blank = () => ({
    date: todayIso(), start: '', end: '', typeId: null as string | null, orgId: preset?.orgId ?? null as string | null, ticketId: preset?.ticketId ?? null as string | null,
    ticketCode: preset?.ticketCode as string | undefined, done: '', result: '', person: '', channelId: null as string | null,
  });
  const from = (e: Entry) => ({ date: e.date, start: e.start, end: e.end, typeId: e.typeId, orgId: e.orgId, ticketId: e.ticketId, ticketCode: e.ticket?.code, done: e.done, result: e.result, person: e.person, channelId: e.channelId });
  const [v, setV] = useState(() => (editing ? from(editing) : blank()));
  const [more, setMore] = useState(false);
  useEffect(() => { setV(editing ? from(editing) : blank()); if (editing) setMore(!!(editing.result || editing.person || editing.channelId)); }, [editing?.id]);   // eslint-disable-line react-hooks/exhaustive-deps
  const set = <K extends keyof typeof v>(k: K, x: (typeof v)[K]) => setV((p) => ({ ...p, [k]: x }));
  const dur = minutes(v.start, v.end);

  const m = useMutation({
    mutationFn: () => {
      const { ticketCode: _c, ...body } = v;
      return api(`/journal/entries${editing ? '/' + editing.id : ''}`, { method: editing ? 'PATCH' : 'POST', body: JSON.stringify(body) });
    },
    onSuccess: async () => {
      await refresh();
      // Кейинги ёзув учун: сана, иш тури ва (мурожаат ичида) боғланиш сақланади, қолгани тозаланади
      setV((p) => ({ ...blank(), date: p.date, typeId: p.typeId, ticketId: preset?.ticketId ?? null, orgId: preset?.orgId ?? null, ticketCode: preset?.ticketCode }));
      setMore(false); onDone?.();
    },
  });
  const submit = () => { if (v.done.trim() && !m.isPending) m.mutate(); };

  return (
    <div className={cn('rounded-xl border border-slate-200 bg-white', compact ? 'p-3' : 'p-4 shadow-sm', editing && 'border-slate-900 ring-1 ring-slate-900')}>
      {editing && <div className="mb-2 flex items-center justify-between text-xs font-medium text-slate-600"><span>{t('Ёзувни таҳрирлаш')}</span><button type="button" className="inline-flex items-center gap-1 hover:text-slate-900" onClick={onDone}><X size={13} />{t('Бекор қилиш')}</button></div>}
      <div className="flex flex-wrap items-center gap-2">
        <div className="w-[150px]"><DatePicker value={v.date} onChange={(x) => set('date', x)} /></div>
        <input type="time" aria-label={t('Бошланиш вақти')} className={timeCls} value={v.start} onChange={(e) => set('start', e.target.value)} />
        <span className="text-slate-400">–</span>
        <input type="time" aria-label={t('Тугаш вақти')} className={timeCls} value={v.end} onChange={(e) => set('end', e.target.value)} />
        {dur != null && <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">{t(fmtMin(dur))}</span>}
        <OptionSelect kind="work_type" value={v.typeId} onChange={(id) => set('typeId', id)} placeholder={t('Иш тури')} className="w-[170px]" />
        {!preset?.orgId && <OrgPicker value={v.orgId} onChange={(id) => set('orgId', id)} className="min-w-[200px] flex-1" />}
        {!preset?.ticketId && <TicketPicker value={v.ticketId} valueLabel={v.ticketCode} orgId={v.orgId} onChange={(id, tk) => { setV((p) => ({ ...p, ticketId: id, ticketCode: tk?.code, orgId: p.orgId ?? tk?.orgId ?? null })); }} className="min-w-[220px] flex-1" />}
      </div>
      <div className="mt-2 flex items-start gap-2">
        <Textarea translit={false} rows={2} value={v.done} placeholder={t('Нима иш бажарилди? (Ctrl+Enter — сақлаш)')} aria-label={t('Бажарилган иш')}
          onChange={(e) => set('done', e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); submit(); } }} className="min-h-[58px] flex-1" />
        <Button onClick={submit} loading={m.isPending} disabled={!v.done.trim()} className="h-[58px] px-5"><Check size={16} />{t(editing ? 'Сақлаш' : 'Қўшиш')}</Button>
      </div>
      <button type="button" onClick={() => setMore((x) => !x)} className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-900" aria-expanded={more}>
        <ChevronDown size={13} className={cn('transition-transform', !more && '-rotate-90')} />{t('Батафсил')}
      </button>
      {more && (
        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          <Input translit={false} placeholder={t('Мурожаатчи (Ф.И.Ш. ёки лавозими)')} value={v.person} onChange={(e) => set('person', e.target.value)} />
          <OptionSelect kind="channel" value={v.channelId} onChange={(id) => set('channelId', id)} placeholder={t('Канал')} />
          <Input translit={false} placeholder={t('Натижа')} value={v.result} onChange={(e) => set('result', e.target.value)} />
        </div>
      )}
      <ErrorNote error={m.error} />
    </div>
  );
}
