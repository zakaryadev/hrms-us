import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '../../../components/kit';
import { useScript } from '../../../lib/script';
import { TONE } from '../labels';

interface Def { cyr: string; lat: string; tone: keyof typeof TONE }

/** Ҳолат белгиси. `onChange` берилса — бир босишда ҳолатни алмаштирадиган меню (формани очмасдан). */
export function StatusChip<S extends string>({ value, defs, order, onChange, size = 'sm' }: {
  value: S; defs: Record<S, Def>; order: S[]; onChange?: (s: S) => void; size?: 'sm' | 'md';
}) {
  const { script } = useScript();
  const d = defs[value];
  const cls = cn('inline-flex items-center gap-1 whitespace-nowrap rounded-md font-medium', size === 'md' ? 'px-2.5 py-1 text-sm' : 'px-2 py-0.5 text-xs', TONE[d.tone]);
  if (!onChange) return <span className={cls}>{d[script]}</span>;
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button type="button" onClick={(e) => e.stopPropagation()} className={cn(cls, 'transition hover:brightness-95 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-slate-400/50')}>
          {d[script]}<ChevronDown size={12} className="opacity-60" />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align="start" sideOffset={4} onClick={(e) => e.stopPropagation()} className="z-[90] min-w-[200px] rounded-md border border-slate-200 bg-white p-1 shadow-md">
          {order.map((s) => (
            <DropdownMenu.Item key={s} onSelect={() => s !== value && onChange(s)}
              className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-[13.5px] outline-none data-[highlighted]:bg-slate-100">
              <span className="flex h-4 w-4 items-center justify-center">{s === value && <Check size={14} />}</span>
              <span className={cn('inline-block h-2 w-2 rounded-full', TONE[defs[s].tone].split(' ')[0])} />{defs[s][script]}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
