import { forwardRef, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from 'react';
import { cn } from './cn';
import { useFieldId } from './Field';

export const inputBase =
  'w-full rounded-lg border bg-white text-sm text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500 read-only:bg-slate-50 read-only:text-slate-700';
export const inputState = (invalid?: boolean) =>
  invalid ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20' : 'border-slate-300 focus:border-brand focus:ring-brand/20';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
  /** Чапдаги икона */
  icon?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input({ invalid, icon, className, id, ...rest }, ref) {
  const fid = useFieldId(id);
  if (!icon) return <input ref={ref} id={fid} aria-invalid={invalid || undefined} className={cn(inputBase, inputState(invalid), 'h-10 px-3', className)} {...rest} />;
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">{icon}</span>
      <input ref={ref} id={fid} aria-invalid={invalid || undefined} className={cn(inputBase, inputState(invalid), 'h-10 pl-9 pr-3', className)} {...rest} />
    </div>
  );
});

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> { invalid?: boolean }

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea({ invalid, className, rows = 3, id, ...rest }, ref) {
  const fid = useFieldId(id);
  return <textarea ref={ref} id={fid} rows={rows} aria-invalid={invalid || undefined} className={cn(inputBase, inputState(invalid), 'resize-y px-3 py-2', className)} {...rest} />;
});
