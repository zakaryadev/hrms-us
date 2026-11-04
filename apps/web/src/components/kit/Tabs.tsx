import { useRef, type KeyboardEvent, type ReactNode } from 'react';
import { cn } from './cn';

export interface TabItem<T extends string> { value: T; label: ReactNode }

/**
 * "Папка табларидек" табчалар: фаол таб контент панелига улангандек кўринади
 * (устида 2px accent чизиқ, остки чегара йўқ). Клавиатура: ←/→, Home/End.
 */
export function Tabs<T extends string>({ items, value, onChange, className, 'aria-label': ariaLabel }: {
  items: TabItem<T>[]; value: T; onChange: (v: T) => void; className?: string; 'aria-label'?: string;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const onKey = (e: KeyboardEvent, i: number) => {
    const last = items.length - 1;
    const to = e.key === 'ArrowRight' ? (i === last ? 0 : i + 1) : e.key === 'ArrowLeft' ? (i === 0 ? last : i - 1) : e.key === 'Home' ? 0 : e.key === 'End' ? last : -1;
    if (to < 0) return;
    e.preventDefault(); onChange(items[to].value); refs.current[to]?.focus();
  };
  return (
    <div role="tablist" aria-label={ariaLabel} className={cn('flex gap-1 overflow-x-auto border-b border-slate-200', className)}>
      {items.map((t, i) => {
        const active = t.value === value;
        return (
          <button key={t.value} ref={(el) => { refs.current[i] = el; }} role="tab" type="button" aria-selected={active} tabIndex={active ? 0 : -1}
            onClick={() => onChange(t.value)} onKeyDown={(e) => onKey(e, i)}
            className={cn('relative -mb-px whitespace-nowrap rounded-t-md border border-b-0 px-4 py-2.5 text-[13.5px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand/40',
              active ? 'border-slate-200 bg-white font-semibold text-navy before:absolute before:inset-x-0 before:top-0 before:h-0.5 before:rounded-t-md before:bg-brand'
                : 'border-transparent text-slate-500 hover:bg-slate-200/50 hover:text-slate-800')}>
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
