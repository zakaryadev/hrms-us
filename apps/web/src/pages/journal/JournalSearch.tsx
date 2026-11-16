import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { useT } from '../../lib/script';

/** Журнал қидируви: мурожаат (ID, муаммо, ташкилот) ва ташкилот бўйича. Ctrl/⌘ + K — фокус. */
export default function JournalSearch() {
  const nav = useNavigate(), t = useT(), ref = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState(''), [d, setD] = useState(''), [open, setOpen] = useState(false);
  useEffect(() => { const x = setTimeout(() => setD(q.trim()), 200); return () => clearTimeout(x); }, [q]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); ref.current?.focus(); } };
    document.addEventListener('keydown', k); return () => document.removeEventListener('keydown', k);
  }, []);
  const tickets = useQuery({ queryKey: ['j-search-t', d], enabled: !!d, queryFn: () => api<any>(`/journal/tickets?pageSize=5&q=${encodeURIComponent(d)}`) });
  const orgs = useQuery({ queryKey: ['j-search-o', d], enabled: !!d, queryFn: () => api<any[]>(`/journal/orgs?q=${encodeURIComponent(d)}`) });
  const T: any[] = d ? tickets.data?.items ?? [] : [], O: any[] = d ? (orgs.data ?? []).slice(0, 5) : [];
  const go = (to: string) => { setOpen(false); setQ(''); ref.current?.blur(); nav(to); };
  return (
    <div className="relative w-full max-w-[360px]">
      <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
      <input ref={ref} aria-label={t('Журналдан қидириш')} placeholder={t('Мурожаат ёки ташкилот қидириш…')} autoComplete="off" value={q}
        onChange={(e) => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 120)}
        onKeyDown={(e) => e.key === 'Escape' && (setOpen(false), ref.current?.blur())}
        className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-14 text-sm shadow-sm placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-[3px] focus:ring-slate-400/40" />
      <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 sm:block">Ctrl K</kbd>
      {open && d && (
        <div className="absolute left-0 right-0 top-12 z-50 max-h-96 overflow-y-auto rounded-lg border border-slate-200 bg-white p-1 shadow-md">
          {T.length > 0 && <p className="eyebrow px-2.5 pb-1 pt-2">{t('Мурожаатлар')}</p>}
          {T.map((x) => <button key={x.id} type="button" onMouseDown={(e) => { e.preventDefault(); go(`/journal/tickets?open=${x.id}`); }} className="block w-full rounded-md px-2.5 py-2 text-left hover:bg-slate-100">
            <span className="text-sm font-medium">{x.code}</span><span className="block truncate text-xs text-slate-500">{x.org?.name ? x.org.name + ' · ' : ''}{x.problem}</span></button>)}
          {O.length > 0 && <p className="eyebrow px-2.5 pb-1 pt-2">{t('Ташкилотлар')}</p>}
          {O.map((x) => <button key={x.id} type="button" onMouseDown={(e) => { e.preventDefault(); go(`/journal/orgs?open=${x.id}`); }} className="block w-full rounded-md px-2.5 py-2 text-left hover:bg-slate-100">
            <span className="text-sm font-medium">{x.name}</span>{x.region && <span className="block text-xs text-slate-500">{t(x.region)}</span>}</button>)}
          {!tickets.isLoading && !orgs.isLoading && T.length + O.length === 0 && <p className="px-3 py-3 text-sm text-slate-500">{t('Ҳеч нарса топилмади')}</p>}
        </div>
      )}
    </div>
  );
}
