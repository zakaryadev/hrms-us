import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { transliterate } from './translit';

export type UiScript = 'cyr' | 'lat';
const KEY = 'journal-script';
const read = (): UiScript => { try { return localStorage.getItem(KEY) === 'lat' ? 'lat' : 'cyr'; } catch { return 'cyr'; } };

interface Ctx { script: UiScript; setScript: (s: UiScript) => void; t: (s?: string | null) => string }
const ScriptCtx = createContext<Ctx>({ script: 'cyr', setScript: () => undefined, t: (s) => s ?? '' });
export const useScript = () => useContext(ScriptCtx);
/** Матнни танланган ёзувда кўрсатади (фақат кўрсатиш учун; базадаги қиймат ўзгармайди). */
export const useT = () => useContext(ScriptCtx).t;

/** Журнал интерфейси ёзуви: кирилл ёки лотин. Танлов браузерда эслаб қолинади. */
export function ScriptProvider({ children }: { children: ReactNode }) {
  const [script, set] = useState<UiScript>(read);
  const setScript = useCallback((s: UiScript) => { set(s); try { localStorage.setItem(KEY, s); } catch { /* ҳеч нарса */ } }, []);
  const t = useCallback((s?: string | null) => (s ? transliterate(s, script, { apostrophe: 'modifier' }) : ''), [script]);
  const value = useMemo(() => ({ script, setScript, t }), [script, setScript, t]);
  return <ScriptCtx.Provider value={value}>{children}</ScriptCtx.Provider>;
}

/** Кир / Lat алмаштиргич */
export function ScriptToggle() {
  const { script, setScript } = useScript();
  return (
    <div role="group" aria-label="Ёзув / Yozuv" className="inline-flex h-8 overflow-hidden rounded-md border border-slate-200 text-xs font-medium">
      {(['cyr', 'lat'] as const).map((s) => (
        <button key={s} type="button" aria-pressed={script === s} onClick={() => setScript(s)}
          className={`px-2.5 transition-colors ${script === s ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 hover:bg-slate-100'}`}>{s === 'cyr' ? 'Кир' : 'Lat'}</button>
      ))}
    </div>
  );
}
