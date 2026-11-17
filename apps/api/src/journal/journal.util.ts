import { transliterate } from '../translit/translit';

/** Ташкилот номини солиштириш учун нормаллаштириш (апостроф турлари, регистр, бўшлиқлар). */
export const normKey = (s: string) =>
  String(s ?? '').toLowerCase().replace(/[‘’ʻʼ`´']/g, "'").replace(/\s+/g, ' ').trim();

/** 'YYYY-MM-DD' → Date (UTC ярим тун, @db.Date учун) */
export const toDate = (s: string) => new Date(s + 'T00:00:00.000Z');
export const iso = (d: Date | null | undefined) => (d ? d.toISOString().slice(0, 10) : '');
/** UTC кун рақами (вақт қисми ташланади: 12:00 кейинги кунга «юмаламайди») */
export const dayNum = (d: Date) => Math.floor(d.getTime() / 864e5);
export const todayIso = () => new Date().toISOString().slice(0, 10);

/** Давомийлик (дақиқа). Ярим тундан ўтса ҳам тўғри ҳисобланади; start==end → 0. */
export function durationMin(start?: string, end?: string): number | null {
  if (!start || !end) return null;
  const t = (x: string) => { const [h, m] = x.split(':').map(Number); return h * 60 + m; };
  return (((t(end) - t(start)) % 1440) + 1440) % 1440;
}

/** Рўйхат элементи API жавобида: ёзув (лотин/кирилл) иккаласи ҳам берилади, танлов клиентда. */
export interface OptionRef { id: string; lat: string; cyr: string }
export const optionRef = (o: { id: string; labelLat: string; labelCyr: string | null } | null | undefined): OptionRef | null =>
  o ? { id: o.id, lat: o.labelLat, cyr: o.labelCyr ?? transliterate(o.labelLat, 'cyr', { apostrophe: 'modifier' }) } : null;
export const OPTION_SELECT = { id: true, labelLat: true, labelCyr: true } as const;
