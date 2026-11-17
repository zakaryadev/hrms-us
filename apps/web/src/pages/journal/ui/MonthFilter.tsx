import { X } from 'lucide-react';
import { PeriodSwitch } from '../../../components/PeriodSwitch';
import { Button } from '../../../components/kit';
import { useT } from '../../../lib/script';
import { MONTHS, todayIso } from '../labels';

/** Ой фильтри: бўш — «Барча ойлар», танланса — [‹ Ноябрь 2026 ›] ва тозалаш. Мавжуд PeriodSwitch'дан фойдаланади. */
export function MonthFilter({ value, onChange, required }: { value: string; onChange: (m: string) => void; required?: boolean }) {
  const t = useT();
  const shift = (d: number) => { const [y, m] = value.split('-').map(Number); const dt = new Date(y, m - 1 + d, 1); onChange(`${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`); };
  if (!value) return <Button variant="secondary" type="button" onClick={() => onChange(todayIso().slice(0, 7))}>{t('Барча ойлар')}</Button>;
  const [y, m] = value.split('-');
  return (
    <div className="flex items-center gap-1">
      <PeriodSwitch label={`${t(MONTHS[+m - 1])} ${y}`} onPrev={() => shift(-1)} onNext={() => shift(1)} prevLabel={t('Олдинги ой')} nextLabel={t('Кейинги ой')} />
      {!required && <Button variant="ghost" size="icon" type="button" aria-label={t('Барча ойлар')} title={t('Барча ойлар')} onClick={() => onChange('')}><X size={15} /></Button>}
    </div>
  );
}
