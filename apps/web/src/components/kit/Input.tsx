import { forwardRef, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from 'react';
import { cn } from './cn';
import { useFieldId } from './Field';
import TranslitButton from './TranslitButton';

export const inputBase =
  'w-full rounded-md border bg-white text-sm text-slate-950 shadow-sm transition-[color,box-shadow] placeholder:text-slate-500 focus:outline-none focus:ring-[3px] disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500';
export const inputState = (invalid?: boolean) =>
  invalid ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20' : 'border-slate-200 focus:border-slate-400 focus:ring-slate-400/40';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
  /** Чапдаги икона */
  icon?: ReactNode;
  /** Транслитерация тугмаси: одатда оддий матн майдонларида автоматик; false — ўчириш, true — мажбурий */
  translit?: boolean;
}

/** Қайси майдонларда тугма автоматик чиқади: оддий матн, ўқиш мумкин эмас эмас, паттерн/автотўлдириш/иконали (қидирув) эмас */
const wantsTranslit = (t: boolean | undefined, p: { type?: string; readOnly?: boolean; disabled?: boolean; pattern?: string; autoComplete?: string; icon?: ReactNode }) =>
  t ?? ((!p.type || p.type === 'text') && !p.readOnly && !p.disabled && !p.pattern && !p.autoComplete && !p.icon);

/** Кўрсатилган қиймат билан onChange чақириш (контролланадиган майдонлар учун) */
const fakeChange = (v: string) => ({ target: { value: v }, currentTarget: { value: v } }) as unknown as React.ChangeEvent<any>;

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input({ invalid, icon, translit, className, id, ...rest }, ref) {
  const fid = useFieldId(id);
  const value = String(rest.value ?? '');
  const tl = wantsTranslit(translit, { ...rest, icon }) && value.trim() !== '' && !!rest.onChange;
  const button = tl ? <TranslitButton value={value} onApply={(v) => rest.onChange!(fakeChange(v))} className="absolute right-1.5 top-1/2 -translate-y-1/2" /> : null;
  if (!icon && !button) return <input ref={ref} id={fid} aria-invalid={invalid || undefined} className={cn(inputBase, inputState(invalid), 'h-9 px-3 read-only:bg-slate-50 read-only:text-slate-700', className)} {...rest} />;
  return (
    <div className="relative">
      {icon && <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">{icon}</span>}
      <input ref={ref} id={fid} aria-invalid={invalid || undefined} className={cn(inputBase, inputState(invalid), 'h-9 pr-3 read-only:bg-slate-50 read-only:text-slate-700', icon ? 'pl-9' : 'pl-3', button && '!pr-10', className)} {...rest} />
      {button}
    </div>
  );
});

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> { invalid?: boolean; translit?: boolean }

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea({ invalid, translit, className, rows = 3, id, ...rest }, ref) {
  const fid = useFieldId(id);
  const value = String(rest.value ?? '');
  const tl = wantsTranslit(translit, rest) && value.trim() !== '' && !!rest.onChange;
  const area = <textarea ref={ref} id={fid} rows={rows} aria-invalid={invalid || undefined} className={cn(inputBase, inputState(invalid), 'resize-y px-3 py-2 read-only:bg-slate-50 read-only:text-slate-700', tl && '!pr-10', className)} {...rest} />;
  if (!tl) return area;
  return (
    <div className="relative">
      {area}
      <TranslitButton value={value} onApply={(v) => rest.onChange!(fakeChange(v))} className="absolute right-1.5 top-1.5" />
    </div>
  );
});
