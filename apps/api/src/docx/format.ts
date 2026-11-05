import { pad, utcDate } from '../calendar/holidays';

/** Ҳужжат ёзуви: кирилл, лотин (1995) ёки янги лотин алифбоси */
export type Lang = 'lat' | 'cyr' | 'lat-new';
export const toLang = (v: unknown): Lang => (v === 'lat' || v === 'lat-new' ? v : 'cyr');
/** Матн/ой номлари жадваллари фақат кирилл ва лотин (1995) бўйича; янги алифбо охирида ўгирилади */
export type Base = 'lat' | 'cyr';
export const baseLang = (l: Lang): Base => (l === 'cyr' ? 'cyr' : 'lat');

const MONTHS: Record<Base, string[]> = {
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
  return `${d.getUTCDate()}-${MONTHS[baseLang(lang)][d.getUTCMonth()]}`;
}
export const fmtYear = (v: D) => (v ? String(utcDate(v).getUTCFullYear()) : '');
export const monthName = (v: D, lang: Lang = 'lat') => (v ? MONTHS[baseLang(lang)][utcDate(v).getUTCMonth()] : '');
export const dayOf = (v: D) => (v ? String(utcDate(v).getUTCDate()) : '');
/** 5750000 -> "5 750 000" */
export const fmtMoney = (v: unknown) => Math.round(Number(v ?? 0)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
