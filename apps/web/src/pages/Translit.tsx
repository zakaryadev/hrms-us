import { ArrowLeftRight, Check, Copy, Eraser } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button, Select, Textarea } from '../components/kit';
import { PageHeader } from '../components/ui';
import { api } from '../lib/api';

type Target = 'cyr' | 'lat' | 'lat-new';
type Script = 'cyr' | 'lat' | 'lat-new' | 'mixed' | 'none';
const TARGETS: [Target, string][] = [['cyr', 'Кирилл'], ['lat', 'Лотин (1995)'], ['lat-new', 'Лотин (янги алифбо)']];
const SCRIPT_LABEL: Record<Script, string> = { cyr: 'кирилл', lat: 'лотин (1995)', 'lat-new': 'лотин (янги алифбо)', mixed: 'аралаш', none: '—' };

export default function Translit() {
  const [text, setText] = useState('');
  const [to, setTo] = useState<Target>('lat');
  const [apostrophe, setApostrophe] = useState<'modifier' | 'ascii'>('modifier');
  const [result, setResult] = useState('');
  const [source, setSource] = useState<Script>('none');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const seq = useRef(0);

  // Ёзилаётганда 250 мс кутиб сервердан ўгиртириб олади (охирги сўров ғолиб)
  useEffect(() => {
    if (!text) { setResult(''); setSource('none'); setError(''); return; }
    const id = ++seq.current;
    const t = setTimeout(() => {
      api<{ result: string; source: Script }>('/translit', { method: 'POST', body: JSON.stringify({ text, to, apostrophe: to === 'cyr' ? undefined : apostrophe }) })
        .then((r) => { if (id === seq.current) { setResult(r.result); setSource(r.source); setError(''); } })
        .catch((e: Error) => { if (id === seq.current) setError(e.message); });
    }, 250);
    return () => clearTimeout(t);
  }, [text, to, apostrophe]);

  const copy = async () => {
    try { await navigator.clipboard.writeText(result); }
    catch { const ta = document.createElement('textarea'); ta.value = result; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); }
    setCopied(true); setTimeout(() => setCopied(false), 1500);
  };
  const swap = () => {
    if (!result) return;
    setText(result);
    if (source === 'cyr' || source === 'lat' || source === 'lat-new') setTo(source);
  };

  return (
    <div className="space-y-4">
      <PageHeader title="Транслитератор" hint="Матнни кирилл, лотин (1995) ва янги лотин алифбосига ўгириш. Ёзув ҳарф-ҳарф аниқланади, шунинг учун аралаш матн ҳам ишлайди." />

      <div className="card flex flex-wrap items-center gap-3 p-4">
        <span className="text-sm text-slate-600">Қайси ёзувга ўгирилсин:</span>
        <div role="radiogroup" aria-label="Ёзув" className="inline-flex flex-wrap gap-1 rounded-lg bg-slate-100 p-1">
          {TARGETS.map(([k, label]) => (
            <button key={k} type="button" role="radio" aria-checked={to === k} onClick={() => setTo(k)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${to === k ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}>{label}</button>
          ))}
        </div>
        {to !== 'cyr' && (
          <label className="ml-auto flex items-center gap-2 text-sm text-slate-600">
            Апостроф
            <Select plain className="!w-auto" value={apostrophe} onChange={(v) => setApostrophe(v as 'modifier' | 'ascii')}>
              <option value="modifier">ʻ ʼ (тўғри белгилар)</option>
              <option value="ascii">' (оддий апостроф)</option>
            </Select>
          </label>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="card p-4">
          <div className="mb-2 flex items-center justify-between gap-2">
            <label htmlFor="tl-src" className="label !mb-0">Матн {source !== 'none' && <span className="ml-1 font-normal text-slate-500">— аниқланди: {SCRIPT_LABEL[source]}</span>}</label>
            <Button variant="secondary" size="sm" type="button" disabled={!text} onClick={() => setText('')}><Eraser size={14} /> Тозалаш</Button>
          </div>
          <Textarea id="tl-src" rows={12} value={text} onChange={(e) => setText(e.target.value)} placeholder="Матнни шу ерга ёзинг ёки қўйинг…" className="font-sans" autoFocus />
          <p className="mt-2 text-xs text-slate-500">{text.length.toLocaleString('ru-RU')} белги</p>
        </div>
        <div className="card p-4">
          <div className="mb-2 flex items-center justify-between gap-2">
            <label htmlFor="tl-out" className="label !mb-0">Натижа — {TARGETS.find(([k]) => k === to)![1]}</label>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" type="button" disabled={!result} onClick={swap} title="Натижани матн ўрнига қўйиш"><ArrowLeftRight size={14} /> Алмаштириш</Button>
              <Button variant="primary" size="sm" type="button" disabled={!result} onClick={copy}>{copied ? <><Check size={14} /> Нусхаланди</> : <><Copy size={14} /> Нусхалаш</>}</Button>
            </div>
          </div>
          <Textarea id="tl-out" rows={12} readOnly value={result} className="bg-slate-50 font-sans" placeholder="Натижа шу ерда кўринади" />
          {error && <p className="mt-2 text-xs text-red-600" role="alert">{error}</p>}
        </div>
      </div>

      <div className="card space-y-3 p-4 text-sm text-slate-600">
        <h2 className="text-sm font-semibold text-slate-900">Янги лотин алифбоси</h2>
        <p>Янги алифбода икки ҳарфли бирикмалар ва апостроф билан ёзиладиган ҳарфлар битта ҳарф билан алмаштирилади (28 ҳарф ва тутуқ белгиси):</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[['Oʻ oʻ', 'Ö ö'], ['Gʻ gʻ', 'Ğ ğ'], ['Sh sh', 'Ş ş'], ['Ch ch', 'Ç ç']].map(([a, b]) => (
            <div key={a} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2"><span className="text-slate-500">{a}</span><span aria-hidden>→</span><span className="text-base font-semibold text-slate-950">{b}</span></div>
          ))}
        </div>
        <ul className="list-disc space-y-1 pl-5 text-xs text-slate-500">
          <li>«ng» алоҳида ҳарф эмас — матнда ўзгармайди; қолган ҳарфлар 1995 йилдаги лотин ёзуви билан бир хил.</li>
          <li>Кирилл → лотин: «е» сўз бошида ва унлидан кейин «ye» (Алиев → Aliyev), «ц» — «s/ts», «ы» — «i», «ь» ташлаб юборилади.</li>
          <li>Лотин → кирилл ўгиришда «ь» ва «ъ» ни ҳамма вақт тиклаб бўлмайди (Закарья → Закаря) — муҳим ҳужжатларда натижани текширинг.</li>
        </ul>
      </div>
    </div>
  );
}
