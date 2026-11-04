import { ChevronLeft, ChevronRight } from 'lucide-react';

/** Ой/йил алмаштиргич: [‹  Ноябрь 2026  ›] */
export function PeriodSwitch({ label, onPrev, onNext, prevLabel, nextLabel }: { label: string; onPrev: () => void; onNext: () => void; prevLabel: string; nextLabel: string }) {
  const btn = 'grid h-full w-9 place-items-center text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand/40';
  return (
    <div className="inline-flex h-9 items-center rounded-md border border-slate-300 bg-white">
      <button type="button" aria-label={prevLabel} onClick={onPrev} className={`${btn} rounded-l-md`}><ChevronLeft size={16} /></button>
      <span className="min-w-[132px] self-stretch border-x border-slate-200 px-3 text-center text-[13.5px] font-medium leading-[34px] tnum" aria-live="polite">{label}</span>
      <button type="button" aria-label={nextLabel} onClick={onNext} className={`${btn} rounded-r-md`}><ChevronRight size={16} /></button>
    </div>
  );
}
