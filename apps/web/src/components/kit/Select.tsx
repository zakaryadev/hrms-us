import * as RS from '@radix-ui/react-select';
import { Check, ChevronDown } from 'lucide-react';
import { Children, isValidElement, type ReactNode } from 'react';
import { cn } from './cn';
import { useFieldId } from './Field';
import { inputBase, inputState } from './Input';

export interface SelectOption { value: string; label: ReactNode; disabled?: boolean }
const EMPTY = '__empty__'; // Radix бўш қийматни қабул қилмайди

/** <option> болаларини ўқийди: эски <select> кодини осон кўчириш учун */
function fromChildren(children: ReactNode): SelectOption[] {
  const out: SelectOption[] = [];
  Children.toArray(children).forEach((c) => {
    if (isValidElement<{ value?: string; children?: ReactNode; disabled?: boolean }>(c) && c.type === 'option') {
      out.push({ value: String(c.props.value ?? ''), label: c.props.children, disabled: c.props.disabled });
    }
  });
  return out;
}

export interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options?: SelectOption[];
  children?: ReactNode;          // <option value="..">Label</option>
  placeholder?: string;
  disabled?: boolean;
  invalid?: boolean;
  required?: boolean;
  id?: string;
  className?: string;
  'aria-label'?: string;
}

export function Select({ value, onChange, options, children, placeholder = 'Танланг', disabled, invalid, required, id, className, ...rest }: SelectProps) {
  const fid = useFieldId(id);
  const all = options ?? fromChildren(children);
  const emptyOpt = all.find((o) => o.value === '');
  const items = all.filter((o) => o.value !== '');
  const selected = all.find((o) => o.value === value);
  const showPlaceholder = !selected || selected.value === '';

  return (
    <RS.Root value={value === '' ? EMPTY : value} onValueChange={(v) => onChange(v === EMPTY ? '' : v)} disabled={disabled} required={required}>
      <RS.Trigger id={fid} aria-label={rest['aria-label']} aria-invalid={invalid || undefined}
        className={cn(inputBase, inputState(invalid), 'flex h-10 items-center justify-between gap-2 px-3 text-left data-[placeholder]:text-slate-400', className)}>
        <span className={cn('truncate', showPlaceholder && 'text-slate-400')}>
          {showPlaceholder ? (emptyOpt?.label ?? placeholder) : selected!.label}
        </span>
        <RS.Icon><ChevronDown size={16} className="shrink-0 text-slate-400" /></RS.Icon>
      </RS.Trigger>
      <RS.Portal>
        <RS.Content position="popper" sideOffset={4} collisionPadding={12}
          className="z-[80] max-h-[min(320px,var(--radix-select-content-available-height))] min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
          <RS.Viewport className="max-h-[inherit] overflow-y-auto p-1">
            {emptyOpt && <Item value={EMPTY} label={emptyOpt.label} muted />}
            {items.map((o) => <Item key={o.value} value={o.value} label={o.label} disabled={o.disabled} />)}
            {all.length === 0 && <div className="px-3 py-2 text-sm text-slate-500">Рўйхат бўш</div>}
          </RS.Viewport>
        </RS.Content>
      </RS.Portal>
    </RS.Root>
  );
}

function Item({ value, label, disabled, muted }: { value: string; label: ReactNode; disabled?: boolean; muted?: boolean }) {
  return (
    <RS.Item value={value} disabled={disabled}
      className={cn('relative flex cursor-pointer select-none items-center rounded-md py-2 pl-8 pr-3 text-sm outline-none data-[disabled]:pointer-events-none data-[disabled]:opacity-40 data-[highlighted]:bg-brand-soft data-[highlighted]:text-brand', muted && 'text-slate-500')}>
      <span className="absolute left-2 flex h-4 w-4 items-center justify-center"><RS.ItemIndicator><Check size={14} /></RS.ItemIndicator></span>
      <RS.ItemText>{label}</RS.ItemText>
    </RS.Item>
  );
}
