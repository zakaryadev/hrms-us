import { Check, ChevronDown, Plus, X } from 'lucide-react';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { cn } from '../../../components/kit';
import { inputBase, inputState } from '../../../components/kit/Input';

export interface ComboItem { id: string; label: string; hint?: string }

/**
 * Қидириладиган танлов (ташкилот, мурожаат учун). Рўйхатни ота компонент беради:
 * `items` — жорий натижалар, `onQuery` — матн ўзгарганда (серверда қидириш учун). Клавиатура: ↑ ↓ Enter Esc.
 * `onCreate` берилса, мос келмаган матн учун «＋ Янги…» таклиф қилинади.
 */
export function Combobox({ value, items, onSelect, onQuery, onCreate, placeholder, createLabel, emptyLabel, selectedLabel, disabled, className, 'aria-label': ariaLabel }: {
  value: string | null;
  items: ComboItem[];
  onSelect: (id: string | null) => void;
  onQuery?: (q: string) => void;
  onCreate?: (text: string) => Promise<void> | void;
  placeholder?: string;
  createLabel?: (text: string) => string;
  emptyLabel?: string;
  /** Танланган қиймат номи (рўйхатда топилмаса ҳам кўрсатиш учун) */
  selectedLabel?: string;
  disabled?: boolean;
  className?: string;
  'aria-label'?: string;
}) {
  const [text, setText] = useState(''), [open, setOpen] = useState(false), [active, setActive] = useState(0), [busy, setBusy] = useState(false);
  const wrap = useRef<HTMLDivElement>(null), input = useRef<HTMLInputElement>(null);
  const listId = useId();
  const selected = items.find((i) => i.id === value);
  const shown = open ? text : selected?.label ?? selectedLabel ?? '';
  const q = text.trim();
  const canCreate = !!onCreate && q.length > 0 && !items.some((i) => i.label.toLowerCase() === q.toLowerCase());
  const rows = useMemo(() => [...items.map((i) => ({ kind: 'item' as const, item: i })), ...(canCreate ? [{ kind: 'create' as const, item: null }] : [])], [items, canCreate]);

  useEffect(() => { setActive(0); }, [text, items.length]);
  useEffect(() => {
    const out = (e: MouseEvent) => { if (!wrap.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', out); return () => document.removeEventListener('mousedown', out);
  }, []);

  const choose = async (i: number) => {
    const r = rows[i]; if (!r) return;
    if (r.kind === 'item') { onSelect(r.item.id); setOpen(false); setText(''); input.current?.blur(); return; }
    setBusy(true);
    try { await onCreate!(q); setOpen(false); setText(''); } finally { setBusy(false); }
  };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setActive((a) => Math.min(a + 1, rows.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === 'Enter' && open && rows.length) { e.preventDefault(); e.stopPropagation(); void choose(active); }
    else if (e.key === 'Escape' && open) { e.stopPropagation(); setOpen(false); setText(''); }
  };

  return (
    <div ref={wrap} className={cn('relative', className)}>
      <input ref={input} role="combobox" aria-expanded={open} aria-controls={listId} aria-autocomplete="list" aria-label={ariaLabel} autoComplete="off" disabled={disabled}
        value={shown} placeholder={placeholder} spellCheck={false}
        onFocus={() => { setOpen(true); setText(''); onQuery?.(''); }}
        onChange={(e) => { setText(e.target.value); setOpen(true); onQuery?.(e.target.value.trim()); }}
        onKeyDown={onKey}
        className={cn(inputBase, inputState(false), 'h-9 truncate pl-3 pr-14')} />
      <div className="absolute right-1.5 top-1/2 flex -translate-y-1/2 items-center gap-0.5">
        {value && !disabled && <button type="button" tabIndex={-1} aria-label="×" onClick={() => { onSelect(null); setText(''); }} className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X size={14} /></button>}
        <ChevronDown size={15} className="pointer-events-none text-slate-400" />
      </div>
      {open && (
        <ul id={listId} role="listbox" className="absolute left-0 right-0 top-full z-[90] mt-1 max-h-64 min-w-[220px] overflow-y-auto rounded-md border border-slate-200 bg-white p-1 shadow-md">
          {rows.map((r, i) => (
            <li key={r.kind === 'item' ? r.item.id : '__create'} role="option" aria-selected={i === active}>
              <button type="button" tabIndex={-1} disabled={busy} onMouseDown={(e) => { e.preventDefault(); void choose(i); }} onMouseEnter={() => setActive(i)}
                className={cn('flex w-full items-start gap-2 rounded px-2.5 py-1.5 text-left text-[13.5px]', i === active && 'bg-slate-100')}>
                {r.kind === 'item' ? (<>
                  <Check size={14} className={cn('mt-0.5 shrink-0', r.item.id === value ? 'opacity-100' : 'opacity-0')} />
                  <span className="min-w-0"><span className="block break-words">{r.item.label}</span>{r.item.hint && <span className="block truncate text-xs text-slate-500">{r.item.hint}</span>}</span>
                </>) : (<><Plus size={14} className="mt-0.5 shrink-0" /><span className="font-medium">{createLabel?.(q) ?? q}</span></>)}
              </button>
            </li>
          ))}
          {rows.length === 0 && <li className="px-3 py-2 text-sm text-slate-500">{emptyLabel ?? '—'}</li>}
        </ul>
      )}
    </div>
  );
}
