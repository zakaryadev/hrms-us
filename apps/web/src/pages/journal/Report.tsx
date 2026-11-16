import { useQuery } from '@tanstack/react-query';
import { Printer } from 'lucide-react';
import { useState } from 'react';
import { Button } from '../../components/kit';
import { ErrorNote, Loading, PageHeader } from '../../components/ui';
import { api } from '../../lib/api';
import { fmtD, fmtMin, today } from './config';
import { useT } from '../../lib/script';
import { Badge } from './JournalList';

const MONTHS = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];

function Bars({ title, rows }: { title: string; rows: { name: string; count: number }[] }) {
  const t = useT();
  const total = rows.reduce((s, r) => s + r.count, 0);
  return (
    <section className="card p-5">
      <h2 className="mb-3 text-sm font-semibold">{t(title)}</h2>
      {rows.length === 0 ? <p className="text-sm text-slate-400">{t('Маълумот йўқ')}</p> : <ul className="space-y-2">{rows.map((r) => (
        <li key={r.name} className="grid grid-cols-[1fr_minmax(80px,40%)_28px] items-center gap-3 text-sm">
          <span className="truncate">{r.name ? t(r.name) : t('(кўрсатилмаган)')}</span>
          <div className="h-2 rounded-full bg-slate-100"><div className="h-full rounded-full bg-brand" style={{ width: `${total ? (r.count / total) * 100 : 0}%` }} /></div>
          <b className="text-right">{r.count}</b>
        </li>))}</ul>}
    </section>
  );
}

export default function Report() {
  const t = useT();
  const [month, setMonth] = useState(today().slice(0, 7)), [scope, setScope] = useState<'dept' | 'me'>('dept');
  const rep = useQuery({ queryKey: ['j', 'report', month, scope], queryFn: () => api<any>(`/journal/report?month=${month}${scope === 'me' ? '&scope=me' : ''}`) });
  const r = rep.data, k = r?.kpi;
  const [y, mm] = month.split('-');
  const tiles: [string, string | number, string][] | undefined = k && [
    ['Кундалик журналдаги ишлар', k.entries, 'Журнал бўйича'], ['Иш вақти (жами)', k.minutes ? t(fmtMin(k.minutes)) : '—', 'Давомийлик киритилганлар'],
    ['Қабул қилинган мурожаатлар', k.received, 'Қабул санаси бўйича'], ['Ҳал қилинган мурожаатлар', k.resolved, 'Ҳал этилган сана бўйича'],
    ['Бошқа бўлимга юборилган', k.forwarded, 'Қабул қилинган ой бўйича'], ['Ўртача ҳал этиш муддати', k.avgDays == null ? '—' : `${k.avgDays} ${t('кун')}`, 'Ҳал қилинганлар бўйича'],
    ['Муддатга риоя этилган', k.inNormPct == null ? '—' : `${k.inNormPct}%`, r.normDays ? `${t('Меъёр:')} ${r.normDays} ${t('кун')}` : 'Меъёр Созламаларда белгиланмаган'],
    ['Мурожаатга боғланган ишлар', k.entriesLinkedToTicket, 'Мурожаат кўрсатилган'],
    ['Ўтказилган ўқитишлар', k.trainings, 'Ўқитиш санаси бўйича'], ['Ўқитилган фойдаланувчилар', k.trainedUsers, 'Иштирокчилар йиғиндиси'],
    ['Билимлар базасига материаллар', k.kb, 'Яратилган сана бўйича'], ['Мурожаатдан яратилган материаллар', k.kbFromTicket, 'Манба мурожаат кўрсатилган'],
  ];
  return (
    <div>
      <div className="hidden print:block"><h1 className="text-xl font-bold">{t('ОЙЛИК ФАОЛИЯТ ҲИСОБОТИ')} — {t(MONTHS[+mm - 1])} {y}</h1></div>
      <div className="print:hidden"><PageHeader title={t('Ойлик ҳисобот')} hint={t('Кўрсаткичлар журналлардаги маълумотлардан автоматик ҳисобланади.')}>
        <input type="month" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} className="h-9 rounded-md border border-slate-200 bg-white px-2 text-sm" />
        <select value={scope} onChange={(e) => setScope(e.target.value as any)} className="h-9 rounded-md border border-slate-200 bg-white px-2 text-sm"><option value="dept">{t('Бутун бўлим')}</option><option value="me">{t('Фақат мен')}</option></select>
        <Button variant="secondary" onClick={() => window.print()}><Printer size={16} />{t('Чоп этиш / PDF')}</Button>
      </PageHeader></div>
      <ErrorNote error={rep.error} />
      {!r ? <Loading rows={6} /> : <div className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{tiles!.map(([l, v, s]) => (
          <div key={l} className="card p-4"><b className="block text-[26px] leading-tight tracking-tight">{v}</b><span className="text-sm text-slate-700">{t(l)}</span><span className="block text-xs text-slate-400">{t(s)}</span></div>))}</div>
        <div className="grid gap-5 lg:grid-cols-2">
          <Bars title="Иш турлари бўйича (кундалик журнал)" rows={r.byWorkType} /><Bars title="Мурожаатлар категориялари" rows={r.byCategory} />
          <Bars title="Мижозлар гуруҳи бўйича мурожаатлар" rows={r.byGroup} /><Bars title="Мурожаатлар ҳолати (шу ой қабул қилинганлар)" rows={r.byStatus} />
        </div>
        <section className="card overflow-x-auto"><h2 className="px-5 pt-5 text-sm font-semibold">{t('Ташкилотлар бўйича')} ({r.orgs.length})</h2>
          <table className="mt-2 w-full text-left"><thead className="border-b bg-slate-50"><tr>{['Ташкилот', 'Ҳудуд', 'Мурожаат', 'Ҳал қилинган', 'Ишлар', 'Ўқитиш', 'Фойдаланувчи'].map((h) => <th key={h} className="th">{t(h)}</th>)}</tr></thead>
            <tbody className="divide-y">{r.orgs.map((o: any) => <tr key={o.id}><td className="td font-medium">{o.name}</td><td className="td">{t(o.region)}</td><td className="td">{o.tickets}</td><td className="td">{o.resolved}</td><td className="td">{o.entries}</td><td className="td">{o.trainings}</td><td className="td">{o.users}</td></tr>)}</tbody></table></section>
        <section className="card overflow-x-auto"><h2 className="px-5 pt-5 text-sm font-semibold">{t('Ой охирида ёпилмаган мурожаатлар')} ({r.open.length})</h2>
          <table className="mt-2 w-full text-left"><thead className="border-b bg-slate-50"><tr>{['ID', 'Қабул қилинган', 'Ташкилот', 'Муаммо', 'Ҳолат', 'Ёши (кун)'].map((h) => <th key={h} className="th">{t(h)}</th>)}</tr></thead>
            <tbody className="divide-y">{r.open.map((t: any) => <tr key={t.id}><td className="td font-medium">{t.code}</td><td className="td">{fmtD(t.received)}</td><td className="td">{t.org}</td><td className="td">{t.problem}</td><td className="td"><Badge v={t.status} /></td><td className={`td ${r.normDays && t.ageDays > r.normDays ? 'font-semibold text-red-600' : ''}`}>{t.ageDays}</td></tr>)}</tbody></table></section>
      </div>}
    </div>
  );
}
