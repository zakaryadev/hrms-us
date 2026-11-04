import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { PeriodSwitch } from '../components/PeriodSwitch';
import { ErrorNote, Loading, PageHeader } from '../components/ui';
import { api, fmtDate } from '../lib/api';
import { Button, Input } from '../components/kit';

const MONTHS = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
const WD = ['Ду', 'Се', 'Чо', 'Па', 'Жу', 'Ша', 'Як'];

const STATUS: Record<string, { label: string; cls: string }> = {
  holiday: { label: 'Расмий байрам', cls: 'bg-red-100 text-red-700' },
  dayoff: { label: 'Кўчирилган дам олиш куни', cls: 'bg-amber-100 text-amber-800' },
  weekend: { label: 'Шанба / якшанба', cls: 'bg-slate-100 text-slate-500' },
  work: { label: 'Иш куни', cls: 'bg-white text-slate-800' },
};
const KINDS: { kind: 'holiday' | 'dayoff' | 'workday'; label: string; hint: string }[] = [
  { kind: 'holiday', label: 'Расмий байрам', hint: 'Иш куни эмас, таътил оралиғига тушса таътилни узайтиради' },
  { kind: 'dayoff', label: 'Кўчирилган дам олиш куни', hint: 'Иш куни эмас, лекин таътилни узайтирмайди' },
  { kind: 'workday', label: 'Иш куни', hint: 'Масалан, ишчи шанба ёки ишчи деб белгиланган байрам' },
];

export default function Calendar() {
  const qc = useQueryClient();
  const [year, setYear] = useState(new Date().getFullYear());
  const [sel, setSel] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const q = useQuery({ queryKey: ['calendar', year], queryFn: () => api<any>(`/calendar?year=${year}`) });
  const done = () => { qc.invalidateQueries({ queryKey: ['calendar'] }); qc.invalidateQueries({ queryKey: ['timesheet'] }); };
  const set = useMutation({ mutationFn: (kind: string) => api(`/calendar/${sel}`, { method: 'PUT', body: JSON.stringify({ kind, ...(note.trim() && { note: note.trim() }) }) }), onSuccess: done });
  const reset = useMutation({ mutationFn: () => api(`/calendar/${sel}`, { method: 'DELETE' }), onSuccess: () => { done(); setNote(''); } });

  const days: any[] = q.data?.days ?? [];
  const byMonth = Array.from({ length: 12 }, (_, m) => days.filter((d) => Number(d.date.slice(5, 7)) === m + 1));
  const cur = days.find((d) => d.date === sel);
  const customList = days.filter((d) => d.custom);
  const today = new Date().toISOString().slice(0, 10);
  const pick = (d: any) => { setSel(d.date); setNote(d.note ?? ''); };

  return (
    <div className="space-y-4">
      <PageHeader title="Иш календари" hint="Байрамлар, кўчирилган дам олиш кунлари ва ишчи шанбалар. Бу ерда белгиланган кунлар таътил, табель ва ойлик ҳисобига таъсир қилади.">
        <PeriodSwitch label={String(year)} onPrev={() => setYear(year - 1)} onNext={() => setYear(year + 1)} prevLabel="Олдинги йил" nextLabel="Кейинги йил" />
      </PageHeader>

      {q.data && !q.data.configured && (
        <p className="card border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">{year}-йил учун ҳайит кунлари ва кўчирилган кунлар киритилмаган. Ҳукумат қарорига қараб кунларни белгиланг, акс ҳолда иш кунлари ва ойлик нотўғри ҳисобланиши мумкин.</p>
      )}
      <ErrorNote error={q.error || set.error || reset.error} />
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
        {Object.entries(STATUS).map(([k, v]) => <span key={k} className="flex items-center gap-1.5"><span className={`inline-block h-4 w-4 rounded border ${v.cls}`} />{v.label}</span>)}
        <span className="flex items-center gap-1.5"><span className="inline-block h-4 w-4 rounded border-2 border-blue-600" />Қўлда белгиланган</span>
      </div>

      {q.isLoading && <Loading rows={6} />}
      {q.data && (
        <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {byMonth.map((list, m) => (
              <div key={m} className="card p-3">
                <h3 className="mb-2 text-sm font-semibold">{MONTHS[m]}</h3>
                <div className="grid grid-cols-7 gap-0.5 text-center text-[11px]">
                  {WD.map((w, i) => <div key={w} className={`py-1 font-medium ${i >= 5 ? 'text-red-500' : 'text-slate-400'}`}>{w}</div>)}
                  {Array.from({ length: (new Date(Date.UTC(year, m, 1)).getUTCDay() + 6) % 7 }, (_, i) => <div key={`e${i}`} />)}
                  {list.map((d) => (
                    <button key={d.date} onClick={() => pick(d)} title={`${fmtDate(d.date)} — ${STATUS[d.status].label}${d.note ? ` (${d.note})` : ''}`}
                      className={`h-7 rounded text-xs transition hover:ring-2 hover:ring-blue-300 ${STATUS[d.status].cls} ${d.custom ? 'ring-2 ring-blue-600' : ''} ${d.date === sel ? '!ring-2 !ring-navy' : ''} ${d.date === today ? 'font-bold underline' : ''}`}>
                      {Number(d.date.slice(8))}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <aside className="space-y-4">
            <div className="card sticky top-4 space-y-3 p-4">
              {!cur && <p className="text-sm text-slate-500">Кунни танланг — унинг ҳолатини ўзгартириш мумкин.</p>}
              {cur && (
                <>
                  <div>
                    <p className="text-lg font-semibold">{fmtDate(cur.date)}</p>
                    <p className="text-sm text-slate-500">{STATUS[cur.status].label}{cur.builtin && !cur.custom && ' (ўрнатилган)'}{cur.custom && ' (қўлда белгиланган)'}</p>
                  </div>
                  <div>
                    <label className="label">Изоҳ (ихтиёрий)</label>
                    <Input maxLength={200} placeholder="Масалан: Ҳукумат қарори №…" value={note} onChange={(e) => setNote(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    {KINDS.map((k) => (
                      <button key={k.kind} disabled={set.isPending} onClick={() => set.mutate(k.kind)}
                        className={`w-full rounded-lg border p-2.5 text-left text-sm transition hover:border-brand ${cur.custom === k.kind ? 'border-brand bg-brand-soft' : 'border-slate-200'}`}>
                        <span className="block font-medium">{k.label}</span><span className="text-xs text-slate-500">{k.hint}</span>
                      </button>
                    ))}
                  </div>
                  {cur.custom && <Button variant="secondary" className="w-full justify-center"  disabled={reset.isPending} onClick={() => reset.mutate()}>Ўзгартиришни бекор қилиш</Button>}
                </>
              )}
            </div>
            <div className="card p-4">
              <h3 className="mb-2 text-sm font-semibold">Қўлда белгиланган кунлар ({customList.length})</h3>
              <ul className="space-y-1 text-sm">
                {customList.map((d) => (
                  <li key={d.date}><button className="flex w-full items-center gap-2 text-left hover:text-brand" onClick={() => pick(d)}>
                    <span className={`rounded px-1.5 py-0.5 text-xs ${STATUS[d.status].cls}`}>{fmtDate(d.date)}</span><span className="truncate text-slate-600">{d.note || STATUS[d.status].label}</span>
                  </button></li>
                ))}
                {customList.length === 0 && <li className="text-slate-500">Йўқ</li>}
              </ul>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
