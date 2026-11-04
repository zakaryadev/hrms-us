import { calcTimesheet, validateDaysData } from './payroll';

/** 2026-dekabr: 22 ish kuni (8-dekabr bayram). Kunlik = oklad / 22 */
const days = (spec: Record<string, number>) => {
  const out: Record<string, string> = {};
  let d = 1;
  for (const [code, n] of Object.entries(spec)) for (let i = 0; i < n; i++) out[String(d++)] = code;
  return out;
};
const base = { year: 2026, month: 12, salary: 6_500_000 };

describe('calcTimesheet — shtat', () => {
  it('to\'liq oy ishlangan -> aynan oklad', () => {
    const r = calcTimesheet({ ...base, employmentType: 'shtat', daysData: days({ '8': 22 }) });
    expect(r.workingDays).toBe(22);
    expect(r.salary).toBe(6_500_000);
  });

  it('20 kun ishlagan + 2 kun kasallik (50%)', () => {
    const r = calcTimesheet({ ...base, employmentType: 'shtat', daysData: days({ '8': 20, KV: 2 }) });
    const daily = 6_500_000 / 22;
    expect(r.salary).toBe(Math.round(20 * daily + 2 * daily * 0.5));
    expect(r.sickDays).toBe(2);
    expect(r.totalHours).toBe(160);
  });

  it('SK (progul) chegiriladi', () => {
    const r = calcTimesheet({ ...base, employmentType: 'shtat', daysData: days({ '8': 21, SK: 1 }) });
    expect(r.salary).toBe(Math.round(21 * (6_500_000 / 22)));
    expect(r.absentDays).toBe(1);
  });

  it('MT, BPT, TSH oylikka qo\'shilmaydi', () => {
    const r = calcTimesheet({ ...base, employmentType: 'shtat', daysData: days({ '8': 10, MT: 5, BPT: 4, TSH: 3 }) });
    expect(r.salary).toBe(Math.round(10 * (6_500_000 / 22)));
    expect(r.leaveDays).toBe(5);
    expect(r.unpaidLeaveDays).toBe(7);
  });

  it('dam olish kunida ishlansa ham oylikdan oshmaydi', () => {
    const r = calcTimesheet({ ...base, employmentType: 'shtat', daysData: days({ '8': 26 }) });
    expect(r.salary).toBe(6_500_000);
  });

  it('7.2 soat ham to\'liq kun, soat yig\'indisi yaxlitlanadi', () => {
    const r = calcTimesheet({ ...base, employmentType: 'shtat', daysData: days({ '7.2': 22 }) });
    expect(r.salary).toBe(6_500_000);
    expect(r.totalHours).toBe(158); // 22 * 7.2 = 158.4
  });

  it('TK ogohlantirish: kun ishlangan hisoblanadi, ammo ajratib sanaladi', () => {
    const r = calcTimesheet({ ...base, employmentType: 'shtat', daysData: days({ '8': 21, TK: 1 }) });
    expect(r.workedDays).toBe(22);
    expect(r.warningDays).toBe(1);
  });

  it("bo'sh oy -> 0", () => {
    expect(calcTimesheet({ ...base, employmentType: 'shtat', daysData: {} }).salary).toBe(0);
  });
});

describe('calcTimesheet — GPX', () => {
  it('kelmagan kunlar chegirilib, 100 so\'mgacha yaxlitlanadi', () => {
    const r = calcTimesheet({ year: 2026, month: 12, salary: 5_000_000, employmentType: 'gpx', daysData: days({ '8': 20, SK: 2 }) });
    const raw = 20 * (5_000_000 / 22); // 4 545 454.54...
    expect(r.salary).toBe(Math.round(raw / 100) * 100);
    expect(r.salary % 100).toBe(0);
    expect(r.salary).toBe(4_545_500);
  });
  it('GPX da kasallik kunlari to\'lanmaydi', () => {
    const r = calcTimesheet({ year: 2026, month: 12, salary: 5_000_000, employmentType: 'gpx', daysData: days({ '8': 20, KV: 2 }) });
    expect(r.salary).toBe(4_545_500);
  });
  it('to\'liq oy -> shartnoma summasi', () => {
    const r = calcTimesheet({ year: 2026, month: 12, salary: 5_000_000, employmentType: 'gpx', daysData: days({ '8': 22 }) });
    expect(r.salary).toBe(5_000_000);
  });
});

describe('validateDaysData', () => {
  it('to\'g\'ri ma\'lumotni qabul qiladi, bo\'sh kataklarni tashlaydi', () => {
    expect(validateDaysData(2026, 12, { '1': '8', '2': '', '31': 'MT' })).toEqual({ '1': '8', '31': 'MT' });
  });
  it("noto'g'ri kod va kunni rad etadi", () => {
    expect(() => validateDaysData(2026, 12, { '1': 'XX' })).toThrow(/kodi/);
    expect(() => validateDaysData(2026, 2, { '30': '8' })).toThrow(/kun/);
    expect(() => validateDaysData(2026, 12, { '0': '8' })).toThrow();
    expect(() => validateDaysData(2026, 12, [] as any)).toThrow();
  });
});
