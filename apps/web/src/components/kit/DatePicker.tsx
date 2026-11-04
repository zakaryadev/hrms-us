import * as Popover from '@radix-ui/react-popover';
import { ChevronLeft, ChevronRight, Calendar as CalIcon, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { DayPicker } from 'react-day-picker';
import { uzCyrl } from 'date-fns/locale/uz-Cyrl';
import { Button } from './Button';
import { cn } from './cn';
import { useFieldId } from './Field';
import { inputBase, inputState } from './Input';
import { Select } from './Select';

const MONTHS = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
const pad = (n: number) => String(n).padStart(2, '0');

/** 'YYYY-MM-DD' -> маҳаллий Date (вақт зонасидан мустақил), нотўғри бўлса null */
export function parseIso(v?: string | null): Date | null {
  if (!v || !/^\d{4}-\d{2}-\d{2}/.test(v)) return null;
  const [y, m, d] = v.slice(0, 10).split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d ? dt : null;
}
export const toIso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const show = (v?: string | null) => { const d = parseIso(v); return d ? `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}` : ''; };

/** "02112026" -> "02.11.2026" (ёзаётганда автоматик нуқталар) */
function mask(raw: string) {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  const parts = [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 8)].filter(Boolean);
  return parts.join('.');
}
/** "02.11.2026" -> Date, фақат тўлиқ ва тақвимда мавжуд сана */
function parseShown(t: string): Date | null {
  const m = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(t);
  if (!m) return null;
  const [d, mo, y] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const dt = new Date(y, mo - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === mo - 1 && dt.getDate() === d && y >= 1900 ? dt : null;
}

export interface DatePickerProps {
  /** ISO сана 'YYYY-MM-DD' ёки '' */
  value: string;
  onChange: (iso: string) => void;
  min?: string;
  max?: string;
  required?: boolean;
  disabled?: boolean;
  invalid?: boolean;
  placeholder?: string;
  id?: string;
  className?: string;
}

export function DatePicker({ value, onChange, min, max, required, disabled, invalid, placeholder = 'кк.оо.йййй', id, className }: DatePickerProps) {
  const fid = useFieldId(id);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(show(value));
  const selected = parseIso(value);
  const minD = parseIso(min), maxD = parseIso(max);
  const [month, setMonth] = useState<Date>(selected ?? new Date());

  // Ташқи қиймат ўзгарса матн ва кўрсатилган ой янгиланади
  useEffect(() => { setText(show(value)); const d = parseIso(value); if (d) setMonth(d); }, [value]);

  const inRange = (d: Date) => (!minD || d >= minD) && (!maxD || d <= maxD);
  const typedDate = text.length === 10 ? parseShown(text) : null;
  const typedBad = text.length === 10 && (!typedDate || !inRange(typedDate));

  const onType = (raw: string) => {
    const t = mask(raw);
    setText(t);
    if (t === '') { onChange(''); return; }
    const d = parseShown(t);
    if (d && inRange(d)) { onChange(toIso(d)); setMonth(d); }
  };
  const commit = (d: Date | undefined | null) => { if (d && inRange(d)) { onChange(toIso(d)); setOpen(false); } };

  const thisYear = new Date().getFullYear();
  const years = useMemo(() => {
    const from = minD?.getFullYear() ?? thisYear - 100, to = maxD?.getFullYear() ?? thisYear + 15;
    return Array.from({ length: to - from + 1 }, (_, i) => String(to - i));
  }, [minD, maxD, thisYear]);

  const today = new Date();
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Anchor asChild>
        <div className={cn('relative', className)}>
          <input id={fid} type="text" inputMode="numeric" autoComplete="off" disabled={disabled} required={required} placeholder={placeholder} value={text} maxLength={10}
            aria-invalid={invalid || typedBad || undefined}
            onChange={(e) => onType(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); } }}
            onBlur={() => { if (!typedDate || !inRange(typedDate)) setText(show(value)); }}
            className={cn(inputBase, inputState(invalid || typedBad), 'h-9 px-3 pr-[4.5rem]')} />
          <div className="absolute right-1 top-1/2 flex -translate-y-1/2 items-center">
            {value && !required && !disabled && (
              <button type="button" aria-label="Санани тозалаш" onClick={() => { onChange(''); setText(''); }} className="rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"><X size={14} /></button>
            )}
            <Popover.Trigger asChild>
              <button type="button" disabled={disabled} aria-label="Календарни очиш" className="rounded-md p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 disabled:opacity-50"><CalIcon size={16} /></button>
            </Popover.Trigger>
          </div>
        </div>
      </Popover.Anchor>
      <Popover.Portal>
        <Popover.Content align="start" sideOffset={6} collisionPadding={12} onOpenAutoFocus={(e) => e.preventDefault()}
          className="z-[70] w-[300px] rounded-lg border border-slate-200 bg-white p-3 shadow-md">
          <div className="mb-2 flex items-center gap-1.5">
            <Button type="button" variant="ghost" size="icon" aria-label="Олдинги ой" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}><ChevronLeft size={16} /></Button>
            <div className="min-w-0 flex-1"><Select aria-label="Ой" className="!h-8 !px-2 text-xs" value={String(month.getMonth())} onChange={(v) => setMonth(new Date(month.getFullYear(), Number(v), 1))} options={MONTHS.map((m, i) => ({ value: String(i), label: m }))} /></div>
            <div className="w-[84px]"><Select aria-label="Йил" className="!h-8 !px-2 text-xs" value={String(month.getFullYear())} onChange={(v) => setMonth(new Date(Number(v), month.getMonth(), 1))} options={years.map((y) => ({ value: y, label: y }))} /></div>
            <Button type="button" variant="ghost" size="icon" aria-label="Кейинги ой" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}><ChevronRight size={16} /></Button>
          </div>
          <DayPicker mode="single" locale={uzCyrl} weekStartsOn={1} hideNavigation month={month} onMonthChange={setMonth} selected={selected ?? undefined}
            onSelect={(d) => commit(d)} disabled={[...(minD ? [{ before: minD }] : []), ...(maxD ? [{ after: maxD }] : [])]} showOutsideDays
            classNames={{
              root: 'text-slate-800', month_caption: 'hidden', month_grid: 'w-full border-collapse',
              weekday: 'h-8 w-[38px] text-center text-[11px] font-medium text-slate-400', day: 'p-0 text-center',
              day_button: 'h-[38px] w-[38px] rounded-md text-sm transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-slate-400/50',
              selected: '[&>button]:bg-brand [&>button]:font-semibold [&>button]:text-white [&>button:hover]:bg-brand/90',
              today: '[&>button]:bg-slate-100 [&>button]:font-semibold', outside: '[&>button]:text-slate-300',
              disabled: '[&>button]:pointer-events-none [&>button]:opacity-30',
            }} />
          <div className="mt-2 flex items-center justify-between border-t pt-2">
            <Button type="button" variant="ghost" size="sm" disabled={!inRange(today)} onClick={() => commit(today)}>Бугун</Button>
            {!required && <Button type="button" variant="ghost" size="sm" onClick={() => { onChange(''); setText(''); setOpen(false); }}>Тозалаш</Button>}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
