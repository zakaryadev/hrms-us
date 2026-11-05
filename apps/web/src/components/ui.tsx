import type { ReactNode } from 'react';
import { STATUS_LABEL } from '../lib/api';

export { Field, Modal } from './kit';

/** Модал ичидаги блок сарлавҳаси */
export function SectionTitle({ children }: { children: ReactNode }) {
  return <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{children}</h3>;
}

/** Бандлик чизиғи (6px). `color` — грифик палитрасидан; 100% дан ошса сариқ-қизил огоҳлантириш */
export function Progress({ value, max, color = '#f54900', label }: { value: number; max: number; color?: string; label?: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  const over = max > 0 && value > max;
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-label={label} aria-valuenow={Math.min(pct, 100)} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-full rounded-full transition-[width]" style={{ width: `${Math.min(100, pct)}%`, background: over ? '#b91c1c' : color }} />
    </div>
  );
}

/** Ҳолат: тўлдирилган кичик бейдж (shadcn Badge) */
export function StatusBadge({ status }: { status: string }) {
  const cls = status === 'ishlamoqda' ? 'bg-emerald-600 text-white' : status === 'tatilda' ? 'bg-amber-400 text-slate-950' : 'bg-slate-200 text-slate-700';
  return <span className={`inline-flex items-center whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium ${cls}`}>{STATUS_LABEL[status] ?? status}</span>;
}

/** Юкланиш ҳолати: жадваллар ўрнида скелет қаторлар */
export function Loading({ rows = 4 }: { rows?: number }) {
  return (
    <div className="card animate-pulse space-y-3 p-5" aria-busy="true" aria-label="Юкланмоқда">
      {Array.from({ length: rows }, (_, i) => <div key={i} className="h-4 rounded bg-slate-100" style={{ width: `${90 - i * 12}%` }} />)}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="py-10 text-center text-sm text-slate-500">{children}</p>;
}

export function ErrorNote({ error }: { error: unknown }) {
  return error ? <p className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700" role="alert">{(error as Error).message}</p> : null;
}

/** Саҳифа сарлавҳаси: h1 (24px/700) + изоҳ; ўнгда тугмалар */
export function PageHeader({ title, hint, children }: { title: string; hint?: string; eyebrow?: string; children?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
      <div className="min-w-[260px] flex-1">
        <h1 className="text-2xl font-bold leading-8 tracking-[-0.025em] text-slate-950">{title}</h1>
        {hint && <p className="mt-1 max-w-3xl text-sm text-slate-500">{hint}</p>}
      </div>
      {children && <div className="ml-auto flex flex-wrap items-center gap-2">{children}</div>}
    </header>
  );
}
