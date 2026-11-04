import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import { STATUS_LABEL } from '../lib/api';

export function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-navy/50 p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`card my-8 w-full ${wide ? 'max-w-4xl' : 'max-w-lg'}`}>
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h2 className="font-semibold">{title}</h2>
          <button onClick={onClose} aria-label="Ёпиш" className="text-slate-400 hover:text-slate-700"><X size={18} /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return <div><label className="label">{label}</label>{children}</div>;
}

/** Модал ичидаги блок сарлавҳаси */
export function SectionTitle({ children }: { children: ReactNode }) {
  return <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{children}</h3>;
}

export function Progress({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
      <div className="h-full rounded-full bg-brand" style={{ width: `${pct}%` }} />
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const cls = status === 'ishlamoqda' ? 'bg-emerald-50 text-emerald-700' : status === 'tatilda' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-600';
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}>{STATUS_LABEL[status] ?? status}</span>;
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
  return error ? <p className="card border-red-300 bg-red-50 p-3 text-sm text-red-700">{(error as Error).message}</p> : null;
}

/** Саҳифа сарлавҳаси: h1 + изоҳ + ўнгда тугмалар */
export function PageHeader({ title, hint, children }: { title: string; hint?: string; children?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold text-navy">{title}</h1>
        {hint && <p className="mt-1 text-sm text-slate-500">{hint}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}
