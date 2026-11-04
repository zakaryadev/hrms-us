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

export function isHoliday(d: Date): boolean {
  const m = d.getUTCMonth() + 1;
  const day = d.getUTCDate();
  if (FIXED_HOLIDAYS.some(([hm, hd]) => hm === m && hd === day)) return true;
  return (MOVABLE_HOLIDAYS[d.getUTCFullYear()] ?? []).includes(ymd(d));
}

export function isWeekend(d: Date): boolean {
  const w = d.getUTCDay();
  return w === 0 || w === 6;
}

export const isWorkingDay = (d: Date) => !isWeekend(d) && !isHoliday(d);

/** Oydagi rasmiy ish kunlari soni (tabel/oylik uchun ham ishlatiladi). */
export function workingDaysInMonth(year: number, month: number): number {
  let count = 0;
  for (let d = utcDate(`${year}-${pad(month)}-01`); d.getUTCMonth() === month - 1; d = addDays(d, 1)) {
    if (isWorkingDay(d)) count++;
  }
  return count;
}
