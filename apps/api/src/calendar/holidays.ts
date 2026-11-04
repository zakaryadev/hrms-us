/**
 * O'zbekiston Respublikasi davlat bayramlari (oy-kun, doimiy sanalar).
 * Hayit kunlari har yili Vazirlar Mahkamasi qarori bilan belgilanadi:
 * MOVABLE jadvaliga yil bo'yicha qo'shiladi (FOYDALANUVCHI TEKSHIRISHI KERAK).
 */
export const FIXED_HOLIDAYS: [number, number][] = [
  [1, 1],   // Yangi yil
  [3, 8],   // Xalqaro xotin-qizlar kuni
  [3, 21],  // Navro'z
  [5, 9],   // Xotira va qadrlash kuni
  [9, 1],   // Mustaqillik kuni
  [10, 1],  // O'qituvchi va murabbiylar kuni
  [12, 8],  // Konstitutsiya kuni
];

/** Yil bo'yicha ko'chma bayramlar (Ramazon va Qurbon hayit): 'YYYY-MM-DD' */
export const MOVABLE_HOLIDAYS: Record<number, string[]> = {
  2026: ['2026-03-20', '2026-05-27'],
};

export const pad = (n: number) => String(n).padStart(2, '0');
export const ymd = (d: Date) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;

/** 'YYYY-MM-DD' (yoki Date) -> UTC yarim tun. Vaqt zonasi bilan bog'liq xatolarning oldini oladi. */
export function utcDate(v: string | Date): Date {
  if (v instanceof Date) return new Date(Date.UTC(v.getUTCFullYear(), v.getUTCMonth(), v.getUTCDate()));
  const [y, m, d] = v.slice(0, 10).split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function addDays(d: Date, n: number): Date {
  return new Date(d.getTime() + n * 86_400_000);
}

/**
 * Қўлда белгиланган кунлар (база: calendar_days). Ҳар бир кун учун ҳолат:
 *  - holiday  — расмий байрам (таътил оралиғига тушса таътилни узайтиради, иш куни эмас);
 *  - dayoff   — кўчирилган дам олиш куни (иш куни эмас, лекин таътилни узайтирмайди);
 *  - workday  — иш куни (масалан, ишчи шанба ёки ишчи куни деб белгиланган байрам).
 * Белгиланмаган кунлар: ўрнатилган байрамлар, шанба/якшанба — дам олиш, қолгани — иш куни.
 */
export type DayKind = 'holiday' | 'dayoff' | 'workday';
export type CalendarOverrides = Record<string, DayKind>;
export type DayStatus = 'holiday' | 'dayoff' | 'weekend' | 'work';

export function isBuiltinHoliday(d: Date): boolean {
  const m = d.getUTCMonth() + 1;
  const day = d.getUTCDate();
  if (FIXED_HOLIDAYS.some(([hm, hd]) => hm === m && hd === day)) return true;
  return (MOVABLE_HOLIDAYS[d.getUTCFullYear()] ?? []).includes(ymd(d));
}

export function isWeekend(d: Date): boolean {
  const w = d.getUTCDay();
  return w === 0 || w === 6;
}

/** Кун ҳолати: қўлда белгиланган > ўрнатилган байрам > ҳафта охири > иш куни */
export function dayStatus(d: Date, ov: CalendarOverrides = {}): DayStatus {
  const o = ov[ymd(d)];
  if (o === 'holiday') return 'holiday';
  if (o === 'dayoff') return 'dayoff';
  if (o === 'workday') return 'work';
  if (isBuiltinHoliday(d)) return 'holiday';
  return isWeekend(d) ? 'weekend' : 'work';
}

export const isHoliday = (d: Date, ov: CalendarOverrides = {}) => dayStatus(d, ov) === 'holiday';
export const isWorkingDay = (d: Date, ov: CalendarOverrides = {}) => dayStatus(d, ov) === 'work';

/** Ойдаги расмий иш кунлари сони (табель/ойлик учун ҳам ишлатилади). */
export function workingDaysInMonth(year: number, month: number, ov: CalendarOverrides = {}): number {
  let count = 0;
  for (let d = utcDate(`${year}-${pad(month)}-01`); d.getUTCMonth() === month - 1; d = addDays(d, 1)) {
    if (isWorkingDay(d, ov)) count++;
  }
  return count;
}
