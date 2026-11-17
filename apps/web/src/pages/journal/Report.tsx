import { useQuery } from '@tanstack/react-query';
import { Printer } from 'lucide-react';
import { useState } from 'react';
import { Button, Select } from '../../components/kit';
import { ErrorNote, Loading, PageHeader } from '../../components/ui';
import { api } from '../../lib/api';
import { useScript, useT } from '../../lib/script';
import { fmtD, fmtMin, MONTHS, TICKET_STATUS, todayIso } from './labels';
import { useL } from './hooks';
import { useJournalLinks } from './JournalShell';
import type { OptionRef, Report as ReportData } from './types';
import { StatusChip } from './ui/StatusMenu';

function Bars({ title, rows }: { title: string; rows: Array<{ label: string; count: number }> }) {
  const t = useT(), total = rows.reduce((s, r) => s + r.count, 0);
  return (
    <section className="card p-5">
      <h2 className="mb-3 text-sm font-semibold">{title}</h2>
      {rows.length === 0 ? <p className="text-sm text-slate-400">{t('Маълумот йўқ')}</p> : (
        <ul className="space-y-2">{rows.map((r) => (
          <li key={r.label} className="grid grid-cols-[1fr_minmax(80px,40%)_28px] items-center gap-3 text-sm">
            <span className="truncate">{r.label}</span>
            <div className="h-2 rounded-full bg-slate-100"><div className="h-full rounded-full bg-brand" style={{ width: `${total ? (r.count / total) * 100 : 0}%` }} /></div>
            <b className="text-right">{r.count}</b>
          </li>))}</ul>)}
    </section>
  );
}

export default function Report() {
  const t = useT(), l = useL(), { script } = useScript(), { openTicket, openOrg } = useJournalLinks();
  const [month, setMonth] = useState(todayIso().slice(0, 7)), [scope, setScope] = useState<'dept' | 'me'>('dept');
  const rep = useQuery({ queryKey: ['j', 'report', month, scope], queryFn: () => api<ReportData>(`/journal/report?month=${month}${scope === 'me' ? '&scope=me' : ''}`) });
  const r = rep.data, k = r?.kpi, [y, mm] = month.split('-');
  const named = (rows: Array<{ name: OptionRef | null; count: number }>) => rows.map((x) => ({ label: x.name ? l(x.name) : t('(кўрсатилмаган)'), count: x.count }));
  const tiles: Array<[string, string | number, string]> | undefined = r && k && [
    ['Кундалик журналдаги ишлар', k.entries, 'Журнал бўйича'], ['Иш вақти (жами)', k.minutes ? t(fmtMin(k.minutes)) : '—', 'Давомийлик киритилганлар'],
    ['Қабул қилинган мурожаатлар', k.received, 'Қабул санаси бўйича'], ['Ҳал қилинган мурожаатлар', k.resolved, 'Ойда ҳал қилинганлар (ҳолатлар тарихидан)'],
    ['Бошқа бўлимга юборилган', k.forwarded, 'Ойда юборилганлар'], ['Ўртача ҳал этиш муддати', k.avgDays == null ? '—' : `${k.avgDays} ${t('кун')}`, 'Ҳал қилинганлар бўйича'],
    ['Муддатга риоя этилган', k.inNormPct == null ? '—' : `${k.inNormPct}%`, r.normDays ? `${t('Меъёр:')} ${r.normDays} ${t('кун')}` : 'Меъёр Созламаларда белгиланмаган'],
    ['Мурожаатга боғланган ишлар', k.entriesLinkedToTicket, 'Мурожаат кўрсатилган'],
    ['Ўтказилган ўқитишлар', k.trainings, 'Ўқитиш санаси бўйича'], ['Ўқитилган фойдаланувчилар', k.trainedUsers, 'Иштирокчилар йиғиндиси'],
    ['Билимлар базасига материаллар', k.kb, 'Яратилган сана бўйича'], ['Мурожаатдан яратилган материаллар', k.kbFromTicket, 'Манба мурожаат кўрсатилган'],
  ];
  return (
    <div>
      <div className="hidden print:block"><h1 className="mb-4 text-xl font-bold">{t('ОЙЛИК ФАОЛИЯТ ҲИСОБОТИ')} — {t(MONTHS[+mm - 1])} {y}</h1></div>
      <div className="print:hidden"><PageHeader title={t('Ойлик ҳисобот')} hint={t('Кўрсаткичлар журналлардаги маълумотлардан ва ҳолатлар тарихидан автоматик ҳисобланади — кейинги ўзгартиришлар ўтган ой натижасини бузмайди.')}>
        <input type="month" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} className="h-9 rounded-md border border-slate-200 bg-white px-2 text-sm" aria-label={t('Ой')} />
        <Select value={scope} onChange={(v) => setScope(v as 'dept' | 'me')} className="w-[170px]" options={[{ value: 'dept', label: t('Бутун бўлим') }, { value: 'me', label: t('Фақат мен') }]} />
        <Button variant="secondary" onClick={() => window.print()}><Printer size={16} />{t('Чоп этиш / PDF')}</Button>
      </PageHeader></div>
      <ErrorNote error={rep.error} />
      {!r || !tiles ? <Loading rows={6} /> : (
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{tiles.map(([label, v, sub]) => (
            <div key={label} className="card p-4"><b className="block text-[26px] leading-tight tracking-tight">{v}</b><span className="text-sm text-slate-700">{t(label)}</span><span className="block text-xs text-slate-400">{t(sub)}</span></div>))}</div>
          <div className="grid gap-5 lg:grid-cols-2">
            <Bars title={t('Иш турлари бўйича (кундалик журнал)')} rows={named(r.byWorkType)} />
            <Bars title={t('Мурожаатлар категориялари')} rows={named(r.byCategory)} />
            <Bars title={t('Мижозлар гуруҳи бўйича мурожаатлар')} rows={named(r.byGroup)} />
            <Bars title={t('Мурожаатлар ҳолати (шу ой қабул қилинганлар)')} rows={r.byStatus.map((x) => ({ label: TICKET_STATUS[x.status][script], count: x.count }))} />
          </div>
          <section className="card overflow-x-auto"><h2 className="px-5 pt-5 text-sm font-semibold">{t('Ташкилотлар бўйича')} ({r.orgs.length})</h2>
            <table className="mt-2 w-full text-left"><thead className="border-b bg-slate-50"><tr>{['Ташкилот', 'Ҳудуд', 'Мурожаат', 'Ҳал қилинган', 'Ишлар', 'Ўқитиш', 'Фойдаланувчи'].map((h) => <th key={h} className="th">{t(h)}</th>)}</tr></thead>
              <tbody className="divide-y">{r.orgs.map((o) => <tr key={o.id}><td className="td"><button className="text-left font-medium hover:underline" onClick={() => openOrg(o.id)}>{o.name}</button></td><td className="td">{o.region}</td><td className="td">{o.tickets}</td><td className="td">{o.resolved}</td><td className="td">{o.entries}</td><td className="td">{o.trainings}</td><td className="td">{o.users}</td></tr>)}</tbody></table></section>
          <section className="card overflow-x-auto"><h2 className="px-5 pt-5 text-sm font-semibold">{t('Ой охирида ёпилмаган мурожаатлар')} ({r.open.length})</h2>
            <table className="mt-2 w-full text-left"><thead className="border-b bg-slate-50"><tr>{['ID', 'Қабул қилинган', 'Ташкилот', 'Муаммо', 'Ҳолат', 'Ёши (кун)'].map((h) => <th key={h} className="th">{t(h)}</th>)}</tr></thead>
              <tbody className="divide-y">{r.open.map((x) => <tr key={x.id}><td className="td"><button className="font-medium hover:underline" onClick={() => openTicket(x.id)}>{x.code}</button></td><td className="td">{fmtD(x.received)}</td><td className="td">{x.org}</td><td className="td">{x.problem}</td><td className="td"><StatusChip value={x.status} defs={TICKET_STATUS} order={[x.status]} /></td><td className={`td ${r.normDays && x.ageDays > r.normDays ? 'font-semibold text-red-600' : ''}`}>{x.ageDays}</td></tr>)}</tbody></table></section>
        </div>)}
    </div>
  );
}
