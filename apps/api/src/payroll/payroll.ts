import { workingDaysInMonth } from '../calendar/holidays';

/** Tabel kodlari */
export const TIMESHEET_CODES = ['8', '7.2', 'MT', 'KV', 'BPT', 'SK', 'TSH', 'TK'] as const;
export type TimesheetCode = (typeof TIMESHEET_CODES)[number];

/** Ishlangan kun hisoblanadigan kodlar. TK — faqat ogohlantirish belgisi, kun ishlangan hisoblanadi. */
const WORKED: TimesheetCode[] = ['8', '7.2', 'TK'];
const HOURS: Partial<Record<TimesheetCode, number>> = { '8': 8, '7.2': 7.2, TK: 8 };

export interface PayrollInput {
  employmentType: 'shtat' | 'gpx';
  salary: number;
  year: number;
  month: number;
  daysData: Record<string, string>;
}

export interface PayrollResult {
  workingDays: number;
  workedDays: number;
  sickDays: number;
  leaveDays: number;
  absentDays: number;
  unpaidLeaveDays: number;
  warningDays: number;
  totalHours: number;
  dailyRate: number;
  salary: number;
}

export const daysInMonth = (year: number, month: number) => new Date(Date.UTC(year, month, 0)).getUTCDate();

export function isValidCode(v: unknown): v is TimesheetCode {
  return typeof v === 'string' && (TIMESHEET_CODES as readonly string[]).includes(v);
}

/** daysData ni tekshiradi: kun kalitlari 1..oy kunlari, kodlar ruxsat etilganlardan. */
export function validateDaysData(year: number, month: number, daysData: unknown): Record<string, TimesheetCode> {
  if (typeof daysData !== 'object' || daysData === null || Array.isArray(daysData)) throw new Error("daysData obyekt bo'lishi kerak");
  const max = daysInMonth(year, month);
  const out: Record<string, TimesheetCode> = {};
  for (const [k, v] of Object.entries(daysData)) {
    const day = Number(k);
    if (!Number.isInteger(day) || day < 1 || day > max) throw new Error(`Noto'g'ri kun: ${k} (oyda ${max} kun bor)`);
    if (v === '' || v === null) continue; // bo'sh katak
    if (!isValidCode(v)) throw new Error(`Noto'g'ri tabel kodi: ${String(v)}`);
    out[String(day)] = v;
  }
  return out;
}

export function calcTimesheet(input: PayrollInput): PayrollResult {
  const workingDays = workingDaysInMonth(input.year, input.month);
  const count = (codes: TimesheetCode[]) => Object.values(input.daysData).filter((c) => (codes as string[]).includes(c)).length;

  const workedDays = count(WORKED);
  const sickDays = count(['KV']);
  const totalHours = Math.round(
    Object.values(input.daysData).reduce((s, c) => s + (HOURS[c as TimesheetCode] ?? 0), 0),
  );
  const dailyRate = workingDays > 0 ? input.salary / workingDays : 0;

  let pay: number;
  if (input.employmentType === 'gpx') {
    // Shartnoma summasi: kelmagan kunlar chegirilib, qolgani 100 so'mgacha yaxlitlanadi. Kasallik to'lanmaydi.
    pay = Math.round(Math.min(workedDays * dailyRate, input.salary) / 100) * 100;
  } else {
    pay = Math.round(Math.min(workedDays * dailyRate + sickDays * dailyRate * 0.5, input.salary));
  }

  return {
    workingDays, workedDays, sickDays,
    leaveDays: count(['MT']), absentDays: count(['SK']), unpaidLeaveDays: count(['BPT', 'TSH']),
    warningDays: count(['TK']), totalHours, dailyRate: Math.round(dailyRate * 100) / 100, salary: pay,
  };
}
