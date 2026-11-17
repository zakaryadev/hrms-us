import { useMutation } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, Eye, EyeOff, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button, Field, Input, Tabs } from '../../components/kit';
import { ErrorNote, Loading, PageHeader } from '../../components/ui';
import { api } from '../../lib/api';
import { useT } from '../../lib/script';
import { useMeta, useRefresh } from './hooks';
import type { OptionItem, OptionKind } from './types';

const KINDS: Array<[OptionKind, string]> = [
  ['work_type', 'Иш турлари'], ['category', 'Категориялар'], ['channel', 'Каналлар'], ['priority', 'Устуворлик'],
  ['client_group', 'Мижозлар гуруҳи'], ['training_format', 'Ўқитиш форматлари'], ['kb_type', 'Материал турлари'],
];

function Row({ o, first, last, onMove }: { o: OptionItem; first: boolean; last: boolean; onMove: (d: -1 | 1) => void }) {
  const t = useT(), refresh = useRefresh();
  const [lat, setLat] = useState(o.lat), [cyr, setCyr] = useState(o.customCyr ?? '');
  useEffect(() => { setLat(o.lat); setCyr(o.customCyr ?? ''); }, [o.lat, o.customCyr]);
  const patch = useMutation({ mutationFn: (body: object) => api(`/journal/options/${o.id}`, { method: 'PATCH', body: JSON.stringify(body) }), onSuccess: refresh });
  const del = useMutation({ mutationFn: () => api(`/journal/options/${o.id}`, { method: 'DELETE' }), onSuccess: refresh });
  return (
    <li className="grid grid-cols-[auto_1fr_1fr_auto] items-center gap-2 px-3 py-2">
      <div className="flex flex-col"><button type="button" disabled={first} aria-label="↑" onClick={() => onMove(-1)} className="rounded p-0.5 text-slate-400 hover:bg-slate-100 disabled:opacity-30"><ArrowUp size={13} /></button>
        <button type="button" disabled={last} aria-label="↓" onClick={() => onMove(1)} className="rounded p-0.5 text-slate-400 hover:bg-slate-100 disabled:opacity-30"><ArrowDown size={13} /></button></div>
      <Input translit={false} value={lat} className={o.active ? '' : 'opacity-50'} aria-label="Lotin" onChange={(e) => setLat(e.target.value)} onBlur={() => lat.trim() && lat !== o.lat && patch.mutate({ labelLat: lat })} />
      <Input translit={false} value={cyr} placeholder={o.cyr} aria-label="Кирилл" className={o.active ? '' : 'opacity-50'} onChange={(e) => setCyr(e.target.value)} onBlur={() => cyr !== (o.customCyr ?? '') && patch.mutate({ labelCyr: cyr.trim() || null })} />
      <div className="flex items-center gap-1">
        <span className="w-10 text-right text-xs text-slate-400" title={t('Ишлатилган ёзувлар сони')}>{o.usage || ''}</span>
        <Button variant="ghost" size="icon" aria-label={o.active ? t('Яшириш') : t('Кўрсатиш')} title={o.active ? t('Яшириш (тanловда чиқмайди)') : t('Кўрсатиш')} onClick={() => patch.mutate({ active: !o.active })}>{o.active ? <Eye size={15} /> : <EyeOff size={15} />}</Button>
        <Button variant="ghost" size="icon" aria-label={t('Ўчириш')} disabled={o.usage > 0} title={o.usage > 0 ? t('Ишлатилган — ўчириш ўрнига яширинг') : t('Ўчириш')} onClick={() => del.mutate()}><Trash2 size={15} /></Button>
      </div>
      {(patch.error || del.error) && <div className="col-span-4"><ErrorNote error={patch.error ?? del.error} /></div>}
    </li>
  );
}

function AddRow({ kind }: { kind: OptionKind }) {
  const t = useT(), refresh = useRefresh(), [lat, setLat] = useState(''), [cyr, setCyr] = useState('');
  const add = useMutation({ mutationFn: () => api('/journal/options', { method: 'POST', body: JSON.stringify({ kind, labelLat: lat, labelCyr: cyr || undefined }) }), onSuccess: async () => { await refresh(); setLat(''); setCyr(''); } });
  const go = () => lat.trim() && add.mutate();
  return (
    <div className="border-t bg-slate-50/60 px-3 py-3">
      <div className="grid grid-cols-[1fr_1fr_auto] gap-2">
        <Input translit={false} value={lat} placeholder={t('Янги элемент (лотин)')} onChange={(e) => setLat(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), go())} />
        <Input translit={false} value={cyr} placeholder={t('Кирилл (ихтиёрий — ўзи ўгирилади)')} onChange={(e) => setCyr(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), go())} />
        <Button onClick={go} loading={add.isPending} disabled={!lat.trim()}><Plus size={15} />{t('Қўшиш')}</Button>
      </div>
      <ErrorNote error={add.error} />
    </div>
  );
}

/** Журнал созламалари (суперадмин): рўйхатлар — қўшиш, номини ўзгартириш (ёзувлар id орқали боғланган, бузилмайди), тартиб, яшириш; меъёр */
export default function JournalSettings() {
  const t = useT(), refresh = useRefresh(), meta = useMeta();
  const [kind, setKind] = useState<OptionKind>('work_type'), [norm, setNorm] = useState('0'), [saved, setSaved] = useState(false);
  useEffect(() => { if (meta.data) setNorm(String(meta.data.normDays)); }, [meta.data?.normDays]);   // eslint-disable-line react-hooks/exhaustive-deps
  const saveNorm = useMutation({
    mutationFn: () => api('/journal/settings', { method: 'PATCH', body: JSON.stringify({ normDays: Math.max(0, Math.floor(Number(norm) || 0)) }) }),
    onSuccess: async () => { await refresh(); setSaved(true); setTimeout(() => setSaved(false), 2000); },
  });
  const order = useMutation({ mutationFn: (ids: string[]) => api('/journal/options/order', { method: 'PUT', body: JSON.stringify({ kind, ids }) }), onSuccess: refresh });
  if (!meta.data) return <Loading rows={6} />;
  const items = meta.data.options[kind];
  const move = (i: number, d: -1 | 1) => { const ids = items.map((o) => o.id); [ids[i], ids[i + d]] = [ids[i + d], ids[i]]; order.mutate(ids); };
  return (
    <div className="space-y-5">
      <PageHeader title={t('Журнал созламалари')} hint={t('Очиладиган рўйхатлар ва мурожаатни кўриб чиқиш меъёри. Ёзувлар рўйхат элементига id орқали боғланган: номни ўзгартириш ҳеч нарсани бузмайди.')} />
      <section className="card p-5">
        <h2 className="mb-3 text-sm font-semibold">{t('Умумий')}</h2>
        <div className="flex flex-wrap items-end gap-3">
          <Field label={t('Мурожаатни кўриб чиқиш меъёри (кун)')} hint={t('0 — меъёр йўқ. Муддатдан ошганлар қизил билан ажратилади.')} className="w-[320px]"><Input type="number" min={0} value={norm} onChange={(e) => setNorm(e.target.value)} /></Field>
          <Button onClick={() => saveNorm.mutate()} loading={saveNorm.isPending}>{t('Сақлаш')}</Button>
          {saved && <span className="pb-2 text-sm text-emerald-700">{t('Сақланди')}</span>}
        </div>
        <ErrorNote error={saveNorm.error} />
      </section>
      <section className="card overflow-hidden">
        <div className="border-b p-4"><Tabs items={KINDS.map(([value, label]) => ({ value, label: t(label) }))} value={kind} onChange={setKind} aria-label={t('Рўйхатлар')} /></div>
        <div className="grid grid-cols-[auto_1fr_1fr_auto] gap-2 border-b bg-slate-50 px-3 py-2 text-xs font-medium text-slate-500"><span className="w-5" /><span>Lotin</span><span>Кирилл</span><span className="w-[134px]" /></div>
        <ErrorNote error={order.error} />
        <ul className="divide-y">{items.map((o, i) => <Row key={o.id} o={o} first={i === 0} last={i === items.length - 1} onMove={(d) => move(i, d)} />)}</ul>
        <AddRow kind={kind} />
      </section>
    </div>
  );
}
