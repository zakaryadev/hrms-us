import type { ReactNode } from 'react';
import { STATUS_LABEL } from '../lib/api';

export { Field, Modal } from './kit';

/** Модал ичидаги блок сарлавҳаси */
export function SectionTitle({ children }: { children: ReactNode }) {
  return <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{children}</h3>;
}

/** Юпқа бандлик чизиғи: 100% дан ошса — огоҳлантирувчи рангда */
export function Progress({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  const over = max > 0 && value > max;
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200" role="progressbar" aria-valuenow={Math.min(pct, 100)} aria-valuemin={0} aria-valuemax={100}>
      <div className={`h-full rounded-full ${over ? 'bg-amber-500' : 'bg-brand'}`} style={{ width: `${Math.min(100, pct)}%` }} />
    </div>
  );
}

/** Ҳолат: рангли нуқта + матн (пилл фонсиз) */
export function StatusBadge({ status }: { status: string }) {
  const dot = status === 'ishlamoqda' ? 'bg-emerald-500' : status === 'tatilda' ? 'bg-amber-500' : 'bg-slate-400';
  return <span className="inline-flex items-center gap-1.5 text-[13px] text-slate-700"><span className={`h-1.5 w-1.5 rounded-full ${dot}`} aria-hidden />{STATUS_LABEL[status] ?? status}</span>;
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

/** Саҳифа сарлавҳаси: юқорида кичик бўлим номи, катта сарлавҳа, изоҳ; ўнгда тугмалар; остида чизиқ */
export function PageHeader({ title, hint, eyebrow, children }: { title: string; hint?: string; eyebrow?: string; children?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-3 border-b border-slate-200 pb-5">
      <div className="min-w-[260px] flex-1">
        {eyebrow && <p className="eyebrow mb-1.5">{eyebrow}</p>}
        <h1 className="text-[26px] font-semibold leading-tight tracking-tight text-navy">{title}</h1>
        {hint && <p className="mt-1.5 max-w-3xl text-[13.5px] text-slate-500">{hint}</p>}
      </div>
      {children && <div className="ml-auto flex flex-wrap items-center gap-2">{children}</div>}
    </header>
  );
}
