import { forwardRef, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from 'react';
import { cn } from './cn';
import { useFieldId } from './Field';

export const inputBase =
  'w-full rounded-md border bg-white text-sm text-slate-950 shadow-sm transition-[color,box-shadow] placeholder:text-slate-500 focus:outline-none focus:ring-[3px] disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500';
export const inputState = (invalid?: boolean) =>
  invalid ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20' : 'border-slate-200 focus:border-slate-400 focus:ring-slate-400/40';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
  /** Чапдаги икона */
  icon?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input({ invalid, icon, className, id, ...rest }, ref) {
  const fid = useFieldId(id);
  if (!icon) return <input ref={ref} id={fid} aria-invalid={invalid || undefined} className={cn(inputBase, inputState(invalid), 'h-9 px-3 read-only:bg-slate-50 read-only:text-slate-700', className)} {...rest} />;
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">{icon}</span>
      <input ref={ref} id={fid} aria-invalid={invalid || undefined} className={cn(inputBase, inputState(invalid), 'h-9 pl-9 pr-3 read-only:bg-slate-50 read-only:text-slate-700', className)} {...rest} />
    </div>
  );
});

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> { invalid?: boolean }

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea({ invalid, className, rows = 3, id, ...rest }, ref) {
  const fid = useFieldId(id);
  return <textarea ref={ref} id={fid} rows={rows} aria-invalid={invalid || undefined} className={cn(inputBase, inputState(invalid), 'resize-y px-3 py-2 read-only:bg-slate-50 read-only:text-slate-700', className)} {...rest} />;
});
