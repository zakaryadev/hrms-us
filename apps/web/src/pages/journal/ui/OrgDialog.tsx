import { useQuery } from '@tanstack/react-query';
import { Modal } from '../../../components/kit';
import { Loading } from '../../../components/ui';
import { api } from '../../../lib/api';
import { useT } from '../../../lib/script';
import { fmtD, fmtMin, TICKET_STATUS } from '../labels';
import { useL } from '../hooks';
import { OPEN_STATUSES, type OrgHistory } from '../types';
import { StatusChip } from './StatusMenu';

/** Ташкилот тарихи: мурожаатлар, ишлар, ўқитишлар */
export function OrgDialog({ id, onClose, onTicket }: { id: string; onClose: () => void; onTicket: (id: string) => void }) {
  const t = useT(), l = useL();
  const q = useQuery({ queryKey: ['j', 'org', id], queryFn: () => api<OrgHistory>(`/journal/orgs/${id}`) });
  const o = q.data;
  const mins = (o?.entries ?? []).reduce((s, e) => s + (e.durationMin ?? 0), 0);
  const stat = (n: number | string, label: string, sub: string) => <div className="card p-3"><b className="block text-2xl leading-tight">{n}</b><span className="text-xs text-slate-600">{label}</span><span className="block text-xs text-slate-400">{sub}</span></div>;
  return (
    <Modal title={o?.name ?? t('Ташкилот')} onClose={onClose} wide>
      {!o ? <Loading /> : (
        <div className="space-y-5">
          <p className="text-sm text-slate-500">{[o.region, o.group && `${t('Гуруҳ')} ${l(o.group)}`, o.note].filter(Boolean).join(' · ') || '—'}</p>
          <div className="grid grid-cols-3 gap-3">
            {stat(o.tickets.length, t('Мурожаатлар'), `${t('очиқ:')} ${o.tickets.filter((x) => OPEN_STATUSES.includes(x.status)).length}`)}
            {stat(o.entries.length, t('Бажарилган ишлар'), mins ? t(fmtMin(mins)) : t('вақт киритилмаган'))}
            {stat(o.trainings.length, t('Ўқитишлар'), `${o.trainings.reduce((s, x) => s + x.count, 0)} ${t('фойдаланувчи')}`)}
          </div>
          <section><h3 className="eyebrow mb-2">{t('Мурожаатлар')}</h3>
            {o.tickets.length === 0 ? <p className="text-sm text-slate-400">{t('Мурожаат йўқ.')}</p> : (
              <ul className="divide-y rounded-lg border">{o.tickets.slice(0, 10).map((x) => (
                <li key={x.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                  <button className="w-[110px] shrink-0 text-left font-medium hover:underline" onClick={() => { onClose(); onTicket(x.id); }}>{x.code}</button>
                  <span className="w-[84px] shrink-0 text-slate-500">{fmtD(x.received)}</span><span className="min-w-0 flex-1 truncate">{x.problem}</span>
                  <StatusChip value={x.status} defs={TICKET_STATUS} order={[x.status]} /></li>))}</ul>)}
          </section>
          <section><h3 className="eyebrow mb-2">{t('Сўнгги ишлар')}</h3>
            {o.entries.length === 0 ? <p className="text-sm text-slate-400">{t('Иш қайд этилмаган.')}</p> : (
              <ul className="divide-y rounded-lg border">{o.entries.slice(0, 8).map((e) => <li key={e.id} className="flex gap-3 px-3 py-2 text-sm"><span className="w-[84px] shrink-0 text-slate-500">{fmtD(e.date)}</span><span className="min-w-0 flex-1">{e.type && <b className="mr-1.5 font-medium">{l(e.type)}</b>}{e.done}</span></li>)}</ul>)}
          </section>
        </div>)}
    </Modal>
  );
}
