import { cn } from './cn';

/** Расм бўлса — расм, йўқ бўлса — исм бош ҳарфлари */
export function Avatar({ src, name, size = 40, className }: { src?: string | null; name: string; size?: number; className?: string }) {
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('');
  return (
    <span className={cn('inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-soft font-semibold text-brand', className)} style={{ width: size, height: size, fontSize: size * 0.38 }}>
      {src ? <img src={src} alt={name} className="h-full w-full object-cover" loading="lazy" /> : initials}
    </span>
  );
}
