import * as RC from '@radix-ui/react-checkbox';
import { Check } from 'lucide-react';
import { useId, type ReactNode } from 'react';
import { cn } from './cn';

export function Checkbox({ checked, onChange, children, disabled, className }: {
  checked: boolean; onChange: (v: boolean) => void; children?: ReactNode; disabled?: boolean; className?: string;
}) {
  const id = useId();
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <RC.Root id={id} checked={checked} disabled={disabled} onCheckedChange={(v) => onChange(v === true)}
        className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded border border-slate-300 bg-white shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 data-[state=checked]:border-brand data-[state=checked]:bg-brand disabled:opacity-50">
        <RC.Indicator><Check size={13} strokeWidth={3} className="text-white" /></RC.Indicator>
      </RC.Root>
      {children && <label htmlFor={id} className="cursor-pointer select-none text-sm text-slate-700">{children}</label>}
    </div>
  );
}
