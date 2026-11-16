/** Ташкилот номини солиштириш учун нормаллаштириш (апостроф турлари, регистр, бўшлиқлар). */
export const normKey = (s: string) =>
  String(s ?? '').toLowerCase().replace(/[‘’ʻʼ`´']/g, "'").replace(/\s+/g, ' ').trim();

/** 'YYYY-MM-DD' → Date (UTC ярим тун, @db.Date учун) */
export const toDate = (s: string) => new Date(s + 'T00:00:00.000Z');
export const iso = (d: Date | null | undefined) => (d ? d.toISOString().slice(0, 10) : '');
export const ym = (d: Date | null | undefined) => (d ? d.toISOString().slice(0, 7) : '');
export const dayNum = (d: Date) => Math.round(d.getTime() / 864e5);

/** Давомийлик (дақиқа). Ярим тундан ўтса ҳам тўғри ҳисобланади; start==end → 0. */
export function durationMin(start?: string, end?: string): number | null {
  if (!start || !end) return null;
  const t = (x: string) => { const [h, m] = x.split(':').map(Number); return h * 60 + m; };
  return (((t(end) - t(start)) % 1440) + 1440) % 1440;
}
