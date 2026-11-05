import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, fullName, photoSrc } from '../lib/api';
import { Avatar } from './kit';

/** Юқори панелдаги қидирув: ходимни Ф.И.Ш., табель рақами ёки ЖШШИР бўйича топиб, профилига ўтади. Ctrl/⌘ + K — фокус. */
export default function GlobalSearch() {
  const nav = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState('');
  const [debounced, setDebounced] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const listId = useId();
  const blurTimer = useRef<ReturnType<typeof setTimeout>>();
  const cancelClose = () => { if (blurTimer.current) clearTimeout(blurTimer.current); };

  useEffect(() => { const t = setTimeout(() => setDebounced(q.trim()), 200); return () => clearTimeout(t); }, [q]);
  useEffect(() => cancelClose, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); inputRef.current?.focus(); } };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const res = useQuery({
    queryKey: ['global-search', debounced], enabled: open && debounced.length >= 1,
    queryFn: () => api<any>(`/employees?archived=false&pageSize=6&q=${encodeURIComponent(debounced)}`),
  });
  const items: any[] = debounced ? res.data?.items ?? [] : [];
  useEffect(() => setActive(0), [debounced]);

  const go = (id: string) => { setOpen(false); setQ(''); inputRef.current?.blur(); nav(`/employees/${id}`); };
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, items.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === 'Enter' && items[active]) { e.preventDefault(); go(items[active].id); }
    else if (e.key === 'Escape') { setOpen(false); inputRef.current?.blur(); }
  };

  return (
    <div className="relative w-full max-w-[360px]">
      <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
      <input ref={inputRef} role="combobox" aria-expanded={open && items.length > 0} aria-controls={listId} aria-autocomplete="list" aria-label="Ходимни қидириш"
        value={q} onChange={(e) => { cancelClose(); setQ(e.target.value); setOpen(true); }} onFocus={() => { cancelClose(); setOpen(true); }} onBlur={() => { cancelClose(); blurTimer.current = setTimeout(() => setOpen(false), 120); }} onKeyDown={onKeyDown}
        placeholder="Ходимни қидириш…" autoComplete="off"
        className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-14 text-sm shadow-sm transition-[box-shadow] placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-[3px] focus:ring-slate-400/40" />
      <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 sm:block">Ctrl K</kbd>
      {open && debounced && (
        <ul id={listId} role="listbox" className="absolute left-0 right-0 top-12 z-50 max-h-80 overflow-y-auto rounded-lg border border-slate-200 bg-white p-1 shadow-md">
          {items.map((e, i) => (
            <li key={e.id} role="option" aria-selected={i === active}>
              <button type="button" onMouseDown={(ev) => { ev.preventDefault(); go(e.id); }} onMouseEnter={() => setActive(i)}
                className={`flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-left ${i === active ? 'bg-slate-100' : ''}`}>
                <Avatar size={30} src={photoSrc(e.photoUrl)} name={fullName(e)} />
                <span className="min-w-0"><span className="block break-words text-sm font-medium">{fullName(e)}</span><span className="block truncate text-xs text-slate-500">№ {e.tabNumber} · {e.position.title}</span></span>
              </button>
            </li>
          ))}
          {!res.isLoading && items.length === 0 && <li className="px-3 py-3 text-sm text-slate-500">Ҳеч нарса топилмади</li>}
          {res.isLoading && <li className="px-3 py-3 text-sm text-slate-500">Қидирилмоқда…</li>}
        </ul>
      )}
    </div>
  );
}
