import { useRef, type KeyboardEvent, type ReactNode } from 'react';
import { cn } from './cn';

export interface TabItem<T extends string> { value: T; label: ReactNode }

/**
 * Сегментли табчалар (shadcn «Tabs» кўриниши): кулранг пилюля ичида фаол таб — оқ, енгил соя.
 * Клавиатура: ←/→, Home/End. Тор экранда ёнга сурилади.
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
    <div role="tablist" aria-label={ariaLabel} className={cn('inline-flex max-w-full items-center gap-0.5 overflow-x-auto rounded-lg bg-slate-100 p-[3px]', className)}>
      {items.map((t, i) => {
        const active = t.value === value;
        return (
          <button key={t.value} ref={(el) => { refs.current[i] = el; }} role="tab" type="button" aria-selected={active} tabIndex={active ? 0 : -1}
            onClick={() => onChange(t.value)} onKeyDown={(e) => onKey(e, i)}
            className={cn('whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-[color,box-shadow] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-slate-400/50',
              active ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500 hover:text-slate-900')}>
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
