/** Бош саҳифа учун ойлик қаторлар (соф функциялар — тест қилиш осон). */

export const MONTH_SHORT = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];

export interface MonthInfo { key: string; label: string; year: number; month: number; endIso: string }

/** Охирги `n` ой (ҳозирги ой охирида), эски -> янги */
export function lastMonths(n: number, now = new Date()): MonthInfo[] {
  const out: MonthInfo[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    const y = d.getUTCFullYear(), m = d.getUTCMonth() + 1;
    const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
    out.push({ key: `${y}-${String(m).padStart(2, '0')}`, label: MONTH_SHORT[m - 1], year: y, month: m, endIso: `${y}-${String(m).padStart(2, '0')}-${String(last).padStart(2, '0')}` });
  }
  return out;
}

export interface EmployeeLite { hireIso: string; shtat: boolean }

export interface Series {
  headcount: number[];   // ой охирида ишлаётганлар (қабул санаси бўйича)
  occupied: number[];    // шундан штатдагилар
  hires: number[];       // шу ойда қабул қилинганлар
  leaves: number[];      // шу ойда бошланган таътиллар
  vacant: number[];      // штат - банд
  occupancy: number[];   // банд / штат, %
}

/**
 * Эслатма: ходимнинг ишдан бўшаш санаси сақланмайди, шунинг учун қатор «ҳозир ишлаётган» ходимларнинг
 * қабул санасига қараб тузилади (ишдан кетганлар чиқариб ташланган).
 */
export function buildSeries(emps: EmployeeLite[], leaveStartIsos: string[], totalStaff: number, months: MonthInfo[]): Series {
  const s: Series = { headcount: [], occupied: [], hires: [], leaves: [], vacant: [], occupancy: [] };
  for (const m of months) {
    const upTo = emps.filter((e) => e.hireIso <= m.endIso);
    const inMonth = emps.filter((e) => e.hireIso.slice(0, 7) === m.key).length;
    const occ = upTo.filter((e) => e.shtat).length;
    s.headcount.push(upTo.length);
    s.occupied.push(occ);
    s.hires.push(inMonth);
    s.leaves.push(leaveStartIsos.filter((d) => d.slice(0, 7) === m.key).length);
    s.vacant.push(Math.max(totalStaff - occ, 0));
    s.occupancy.push(totalStaff > 0 ? Math.round((occ / totalStaff) * 100) : 0);
  }
  return s;
}

/** Охирги қиймат ва олдинги ойга нисбатан фарқ */
export const delta = (arr: number[]) => (arr.length >= 2 ? arr[arr.length - 1] - arr[arr.length - 2] : 0);
