import { addDays, isHoliday, isWorkingDay, utcDate, ymd } from './holidays';

export interface LeaveResult {
  endDate: string;
  returnDate: string;
  totalDays: number;
  /** Ta'til oralig'iga tushgan va muddatni uzaytirgan bayram kunlari */
  holidaysInRange: string[];
}

/**
 * Ta'til: `days` kalendar kun, boshlanish sanasi kiradi. Oraliqqa tushgan har bir davlat bayrami
 * ta'tilni shuncha kunga uzaytiradi (uzaytirilgan kunlar ichidagi bayramlar ham hisobga olinadi).
 * Ishga chiqish sanasi — tugashdan keyingi birinchi ish kuni.
 */
export function calcLeave(startDate: string, days: number): LeaveResult {
  if (!Number.isInteger(days) || days < 1) throw new Error("Ta'til kunlari musbat butun son bo'lishi kerak");
  const start = utcDate(startDate);
  const holidays: string[] = [];
  let remaining = days;
  let cursor = start;
  let last = start;
  while (remaining > 0) {
    last = cursor;
    if (isHoliday(cursor)) holidays.push(ymd(cursor)); // bayram kuni ta'til kunidan sanalmaydi
    else remaining--;
    cursor = addDays(cursor, 1);
  }
  // Bayram kuni oxirgi kun bo'lib qolmasligi uchun: oxirgi sanalgan kun — `last`
  let ret = addDays(last, 1);
  while (!isWorkingDay(ret)) ret = addDays(ret, 1);
  return { endDate: ymd(last), returnDate: ymd(ret), totalDays: days, holidaysInRange: holidays };
}

/** Ish yili: qabul sanasi yubilyeriga ko'ra, `onDate` ni o'z ichiga olgan yil (masalan 01.05.2026–30.04.2027). */
export function workYear(hireDate: string, onDate: string): { start: string; end: string } {
  const hire = utcDate(hireDate);
  const on = utcDate(onDate);
  let y = on.getUTCFullYear();
  let start = new Date(Date.UTC(y, hire.getUTCMonth(), hire.getUTCDate()));
  if (start > on) start = new Date(Date.UTC(--y, hire.getUTCMonth(), hire.getUTCDate()));
  const end = addDays(new Date(Date.UTC(y + 1, hire.getUTCMonth(), hire.getUTCDate())), -1);
  return { start: ymd(start), end: ymd(end) };
}
