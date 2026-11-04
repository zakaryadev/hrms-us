import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from './cn';

/** Тугма услублари: <Button> ва <a> (ҳавола) учун умумий */
export const buttonStyles = cva(
  'inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-slate-400/50 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'bg-brand text-white shadow-sm hover:bg-brand/90 active:bg-brand/80',
        secondary: 'border border-slate-200 bg-white text-slate-900 shadow-sm hover:bg-slate-100 active:bg-slate-200/70',
        ghost: 'text-slate-700 hover:bg-slate-100 hover:text-slate-900',
        danger: 'bg-red-600 text-white shadow-sm hover:bg-red-700 active:bg-red-700',
      },
      size: { sm: 'h-8 px-3 text-xs', md: 'h-9 px-4 text-sm', icon: 'h-8 w-8 p-0' },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonStyles> {
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant, size, loading, disabled, className, children, type, ...rest }, ref,
) {
  return (
    <button ref={ref} type={type} disabled={disabled || loading} aria-busy={loading || undefined} className={cn(buttonStyles({ variant, size }), className)} {...rest}>
      {loading && <Loader2 size={16} className="animate-spin" aria-hidden />}
      {children}
    </button>
  );
});
