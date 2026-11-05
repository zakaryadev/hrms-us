import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Plus, Save, Search } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Button, Input, Select, cn } from '../components/kit';
import { api } from '../lib/api';
import { checkVendorFiles, loadSuperDoc, measureSpeed } from '../lib/superdoc';

type Script = 'cyr' | 'lat' | 'lat-new';
type Tpl = { name: string; label: string; custom: boolean; masterScript: Script | null; fields: string[]; available: string[]; blocks: string[] };
const SCRIPTS: [Script, string][] = [['cyr', 'Кирилл'], ['lat', 'Лотин'], ['lat-new', 'Янги алифбо']];
const DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

/** Word шаблонни браузерда таҳрирлаш (SuperDoc): расм/жадвал/форматлаш сақланади, {{майдон}}ларни рўйхатдан қўйиш мумкин */
export default function TemplateEditor() {
  const { name = '' } = useParams();
  const [sp, setSp] = useSearchParams();
  const raw = sp.get('script');
  const script: Script = raw === 'lat' || raw === 'lat-new' ? raw : 'cyr';
  const list = useQuery({ queryKey: ['templates'], queryFn: () => api<Tpl[]>('/documents/templates') });
  const tpl = list.data?.find((t) => t.name === name);

  const host = useRef<HTMLDivElement>(null);
  const bar = useRef<HTMLDivElement>(null);
  const sd = useRef<any>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState('');
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [q, setQ] = useState('');
  const [reload, setReload] = useState(0);
  const [phase, setPhase] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const [diag, setDiag] = useState<string[]>([]);
  // ?timeout=секунд — синов учун (одатда 120 сония)
  const limit = Math.min(Math.max(Number(sp.get('timeout')) || 120, 5), 600);

  // Муҳаррирни юклаш: шу ёзувдаги шаблон (бошқа ёзувда бўлса автоматик ўгирилган) — фақат шу саҳифада
  useEffect(() => {
    let cancelled = false;
    const started = Date.now();
    setState('loading'); setDirty(false); setMsg(null); setError(''); setDiag([]); setElapsed(0); setPhase('Шаблон юкланмоқда…');
    const tick = setInterval(() => setElapsed(Math.round((Date.now() - started) / 1000)), 1000);
    // Вақт чегараси: муҳаррир тайёр бўлмаса, «юкланмоқда» да қотиб қолмасдан сабабини кўрсатади
    const fail = async (text: string) => {
      if (cancelled) return;
      setError(text); setState('error');
      const [checks, speed] = await Promise.all([checkVendorFiles(8000), measureSpeed()]);
      if (!cancelled) setDiag([...checks.map((c) => c.line), speed, `Браузер: ${navigator.userAgent}`]);
    };
    const timer = setTimeout(() => fail(`Муҳаррир ${limit} сонияда очилмади. Тармоқ секин бўлиши мумкин (муҳаррир файллари ~10 МБ) — Wi-Fi да ёки компьютерда қайта уриниб кўринг.`), limit * 1000);
    (async () => {
      try {
        const res = await fetch(`/api/documents/templates/${name}/download?script=${script}`);
        if (res.status === 401) { window.location.assign('/login'); return; }
        if (!res.ok) throw new Error(res.status === 404 ? 'Шаблон топилмади' : `Шаблонни юклаб бўлмади (${res.status})`);
        const file = new File([await res.blob()], `${name}.docx`, { type: DOCX });
        setPhase('Муҳаррир файллари текширилмоқда…');
        const checks = await checkVendorFiles();
        if (cancelled) return;
        const bad = checks.filter((c) => !c.ok);
        if (bad.length) { setDiag(checks.map((c) => c.line)); throw new Error(`Серверда муҳаррир файллари муаммоси (${bad.length}/${checks.length}): сайтни янгилаш (deploy) тугалланмаган бўлиши мумкин.`); }
        setPhase('Муҳаррир юкланмоқда…');
        const SuperDoc = await loadSuperDoc();
        if (cancelled || !host.current) return;
        setPhase('Ҳужжат очилмоқда…');
        let readyAt = 0;
        sd.current = new SuperDoc({
          selector: host.current,
          document: file,
          documentMode: 'editing',
          telemetry: { enabled: false },   // ҳужжат очилиши ҳақидаги маълумот ташқарига юборилмайди
          ui: { toolbar: { container: bar.current! }, comments: false },
          onReady: () => { readyAt = Date.now(); clearTimeout(timer); if (!cancelled) setState('ready'); },
          onEditorUpdate: () => { if (readyAt && Date.now() - readyAt > 1000) setDirty(true); },
          onException: (e: any) => { console.error('SuperDoc:', e); if (!readyAt) fail(`Муҳаррир хатоси: ${e?.error?.message ?? e?.message ?? 'номаълум'}`); },
        });
      } catch (e) { clearTimeout(timer); if (!cancelled) { setError((e as Error).message); setState('error'); } }
    })();
    return () => { cancelled = true; clearTimeout(timer); clearInterval(tick); try { sd.current?.destroy(); } catch { /* ҳеч нарса */ } sd.current = null; };
  }, [name, script, reload]);

  // Сақланмаган ўзгариш бўлса, саҳифани ёпишдан олдин сўрайди
  useEffect(() => {
    const h = (e: BeforeUnloadEvent) => { if (dirty) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [dirty]);

  const guard = (go: () => void) => { if (!dirty || confirm('Сақланмаган ўзгаришлар йўқолади. Давом этайми?')) go(); };

  const insert = (field: string) => {
    const ae = sd.current?.activeEditor;
    if (!ae) return;
    ae.editCommands.text.insert({ text: `{{${field}}}` });
    ae.focus?.();
    setDirty(true);
  };

  const save = async () => {
    if (!sd.current) return;
    setSaving(true); setMsg(null);
    try {
      const blob: Blob = await sd.current.export({ triggerDownload: false });
      const f = new FormData(); f.append('file', new File([blob], `${name}.docx`, { type: DOCX }));
      const r = await api<{ script: Script; unknownFields: string[] }>(`/documents/templates/${name}?script=${script}`, { method: 'PUT', body: f });
      setDirty(false);
      setMsg({ ok: true, text: `Сақланди. Асосий шаблон — ${SCRIPTS.find(([k]) => k === r.script)![1]}; қолган ёзувлар автоматик ўгирилади.${r.unknownFields.length ? ` Номаълум майдонлар бўш чиқади: ${r.unknownFields.map((x) => `{{${x}}}`).join(', ')}` : ''}` });
    } catch (e) { setMsg({ ok: false, text: (e as Error).message }); }
    finally { setSaving(false); }
  };

  const used = new Set(tpl?.fields ?? []);
  const fields = (tpl?.available ?? []).filter((f) => f.toLowerCase().includes(q.trim().toLowerCase()));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <Link to="/templates" onClick={(e) => { if (dirty && !confirm('Сақланмаган ўзгаришлар йўқолади. Давом этайми?')) e.preventDefault(); }} className="inline-flex items-center gap-1 whitespace-nowrap text-sm text-slate-500 hover:text-slate-900"><ArrowLeft size={14} /> Шаблонлар</Link>
        <h1 className="min-w-0 basis-full break-words text-xl font-bold tracking-[-0.025em] sm:flex-1 sm:basis-0">{tpl?.label ?? name}{dirty && <span className="ml-2 text-xs font-normal text-amber-700">— сақланмаган ўзгаришлар бор</span>}</h1>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          Ёзув
          <Select plain className="!w-auto" value={script} onChange={(v) => guard(() => setSp({ script: v }, { replace: true }))}>
            {SCRIPTS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </Select>
        </label>
        <Button variant="primary" disabled={state !== 'ready' || saving || !dirty} onClick={save}><Save size={16} /> {saving ? 'Сақланмоқда…' : 'Сақлаш'}</Button>
      </div>

      <p className="text-xs text-slate-500">Сақлаганингизда шу ёзув (<b>{SCRIPTS.find(([k]) => k === script)![1]}</b>) асосий шаблон бўлади, қолган ёзувлардаги ҳужжатлар унинг бутун матнини автоматик ўгириб ҳосил қилинади. Эски версия «Олдинги» тугмаси билан тикланади.</p>
      {msg && <div role={msg.ok ? 'status' : 'alert'} className={cn('card p-3 text-sm', msg.ok ? 'text-emerald-700' : 'text-red-600')}>{msg.text}</div>}

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_280px]">
        <div className="card min-w-0 overflow-hidden" data-editor-state={state}>
          <div ref={bar} className="border-b border-slate-200 bg-white" />
          <div className="relative h-[calc(100vh-17rem)] min-h-[420px] overflow-auto bg-slate-100">
            <div ref={host} className="min-h-full" />
            {state === 'loading' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-100/80 p-6 text-center text-sm text-slate-600">
                <p className="font-medium text-slate-800">Муҳаррир юкланмоқда…</p>
                <p>{phase} <span className="tnum text-slate-400">{elapsed} с</span></p>
                {elapsed >= 15 && <p className="max-w-sm text-xs text-slate-500">Биринчи очилишда ~10 МБ файл юкланади — секин тармоқда 1–2 дақиқа кетиши мумкин. Кейинги очилишлар тезроқ.</p>}
              </div>
            )}
            {state === 'error' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 overflow-auto bg-slate-100 p-6 text-center text-sm">
                <p className="text-red-600">{error || 'Муҳаррирни юклаб бўлмади'}</p>
                {diag.length > 0 && (
                  <pre className="max-w-full overflow-x-auto whitespace-pre-wrap break-all rounded-md border border-slate-200 bg-white p-3 text-left text-[11px] leading-5 text-slate-700">{diag.join('\n')}</pre>
                )}
                <Button variant="secondary" onClick={() => setReload((n) => n + 1)}>Қайта уриниш</Button>
              </div>
            )}
          </div>
        </div>

        <aside className="card flex max-h-[calc(100vh-14rem)] min-h-[260px] flex-col p-3">
          <h2 className="text-sm font-semibold text-slate-900">Майдонлар</h2>
          <p className="mb-2 text-xs text-slate-500">Курсорни керакли жойга қўйиб, майдонни босинг — <code className="rounded bg-slate-100 px-1">{'{{майдон}}'}</code> шу жойга тушади. Ҳужжат яратилганда ходим маълумоти билан алмашади.</p>
          <Input icon={<Search size={15} />} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Қидириш…" aria-label="Майдон қидириш" />
          <ul className="mt-2 min-h-0 flex-1 space-y-1 overflow-auto pr-1">
            {fields.map((f) => (
              <li key={f}>
                <button type="button" disabled={state !== 'ready'} onClick={() => insert(f)} title="Курсор жойига қўйиш"
                  className="flex w-full items-center justify-between gap-2 rounded-md border border-slate-200 px-2 py-1.5 text-left font-mono text-xs text-slate-800 transition-colors hover:bg-slate-50 disabled:opacity-50">
                  <span className="min-w-0 break-all">{f}</span>
                  {used.has(f) ? <span className="shrink-0 rounded bg-emerald-50 px-1 text-[10px] font-sans text-emerald-700">бор</span> : <Plus size={13} className="shrink-0 text-slate-400" />}
                </button>
              </li>
            ))}
            {fields.length === 0 && <li className="px-1 py-2 text-xs text-slate-500">Топилмади</li>}
          </ul>
          {!!tpl?.blocks.length && (
            <p className="mt-2 border-t pt-2 text-xs text-slate-500">Блоклар ({tpl.blocks.map((b) => `{{#${b}}}…{{/${b}}}`).join(', ')}) такрорланувчи/шартли қисмлар — уларнинг белгиларини ўзгартирманг ва ўчирманг.</p>
          )}
        </aside>
      </div>
    </div>
  );
}
