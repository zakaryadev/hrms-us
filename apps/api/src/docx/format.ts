import { pad, utcDate } from '../calendar/holidays';

const MONTHS = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr'];

type D = string | Date | null | undefined;

/** 31.12.2026 */
export function fmtDate(v: D): string {
  if (!v) return '';
  const d = utcDate(v);
  return `${pad(d.getUTCDate())}.${pad(d.getUTCMonth() + 1)}.${d.getUTCFullYear()}`;
}
/** 2-noyabr */
export function fmtDayMonth(v: D): string {
  if (!v) return '';
  const d = utcDate(v);
  return `${d.getUTCDate()}-${MONTHS[d.getUTCMonth()]}`;
}
export const fmtYear = (v: D) => (v ? String(utcDate(v).getUTCFullYear()) : '');
export const monthName = (v: D) => (v ? MONTHS[utcDate(v).getUTCMonth()] : '');
export const dayOf = (v: D) => (v ? String(utcDate(v).getUTCDate()) : '');
/** 5750000 -> "5 750 000" */
export const fmtMoney = (v: unknown) => Math.round(Number(v ?? 0)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
