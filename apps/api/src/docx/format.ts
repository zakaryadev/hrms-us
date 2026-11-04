import { pad, utcDate } from '../calendar/holidays';

export type Lang = 'lat' | 'cyr';
export const toLang = (v: unknown): Lang => (v === 'lat' ? 'lat' : 'cyr');

const MONTHS: Record<Lang, string[]> = {
  lat: ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr'],
  cyr: ['январ', 'феврал', 'март', 'апрел', 'май', 'июн', 'июл', 'август', 'сентябр', 'октябр', 'ноябр', 'декабр'],
};

type D = string | Date | null | undefined;

/** 31.12.2026 */
export function fmtDate(v: D): string {
  if (!v) return '';
  const d = utcDate(v);
  return `${pad(d.getUTCDate())}.${pad(d.getUTCMonth() + 1)}.${d.getUTCFullYear()}`;
}
/** 2-noyabr / 2-ноябр */
export function fmtDayMonth(v: D, lang: Lang = 'lat'): string {
  if (!v) return '';
  const d = utcDate(v);
  return `${d.getUTCDate()}-${MONTHS[lang][d.getUTCMonth()]}`;
}
export const fmtYear = (v: D) => (v ? String(utcDate(v).getUTCFullYear()) : '');
export const monthName = (v: D, lang: Lang = 'lat') => (v ? MONTHS[lang][utcDate(v).getUTCMonth()] : '');
export const dayOf = (v: D) => (v ? String(utcDate(v).getUTCDate()) : '');
/** 5750000 -> "5 750 000" */
export const fmtMoney = (v: unknown) => Math.round(Number(v ?? 0)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
