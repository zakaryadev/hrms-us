import * as Popover from '@radix-ui/react-popover';
import { Languages } from 'lucide-react';
import { useState } from 'react';
import { transliterate, type Target } from '../../lib/translit';
import { cn } from './cn';

const TARGETS: [Target, string][] = [['cyr', 'Кирилл'], ['lat', 'Лотин'], ['lat-new', 'Янги алифбо']];
const preview = (s: string) => (s.length > 48 ? s.slice(0, 48) + '…' : s);

/** Майдондаги матнни шу заҳоти кирилл / лотин / янги алифбога ўгириш тугмаси (меню қийматнинг кўриниши билан) */
export default function TranslitButton({ value, onApply, className }: { value: string; onApply: (v: string) => void; className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button type="button" aria-label="Транслитерация (кирилл ⇄ лотин)" title="Кирилл ⇄ лотин"
          className={cn('inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/50', className)}>
          <Languages size={15} />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content align="end" sideOffset={6} onOpenAutoFocus={(e) => e.preventDefault()} className="z-[60] w-72 rounded-lg border border-slate-200 bg-white p-1.5 shadow-lg">
          <p className="px-2 pb-1 pt-1 text-[11px] font-medium uppercase tracking-wide text-slate-500">Қайси ёзувга ўгирилсин</p>
          {TARGETS.map(([k, label]) => {
            const out = transliterate(value, k);
            const same = out === value;
            return (
              <button key={k} type="button" disabled={same} onClick={() => { onApply(out); setOpen(false); }}
                className="flex w-full flex-col items-start rounded-md px-2 py-1.5 text-left transition-colors hover:bg-slate-100 focus-visible:bg-slate-100 focus-visible:outline-none disabled:cursor-default disabled:opacity-45 disabled:hover:bg-transparent">
                <span className="text-sm font-medium text-slate-900">{label}{same && <span className="ml-1.5 text-xs font-normal text-slate-500">— шундай</span>}</span>
                {!same && <span className="max-w-full break-words text-xs text-slate-500">{preview(out)}</span>}
              </button>
            );
          })}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
