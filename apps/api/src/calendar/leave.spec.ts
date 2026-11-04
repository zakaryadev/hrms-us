import { workingDaysInMonth } from './holidays';
import { calcLeave, workYear } from './leave';

describe('calcLeave', () => {
  it("hujjatdagi namuna: 16.11.2026 + 27 kun, 8-dekabr bayram -> tugash 13.12, chiqish 14.12", () => {
    const r = calcLeave('2026-11-16', 27);
    expect(r.holidaysInRange).toEqual(['2026-12-08']);
    expect(r.endDate).toBe('2026-12-13');
    expect(r.returnDate).toBe('2026-12-14');
  });

  it("bayramsiz oraliq: kunlar aynan jami kunga teng", () => {
    const r = calcLeave('2026-06-01', 14);
    expect(r.holidaysInRange).toEqual([]);
    expect(r.endDate).toBe('2026-06-14');
    expect(r.returnDate).toBe('2026-06-15'); // dushanba
  });

  it('tugash kuni juma bo\'lsa, ishga chiqish dushanba', () => {
    const r = calcLeave('2026-06-01', 5); // 1..5-iyun, dushanba-juma
    expect(r.endDate).toBe('2026-06-05');
    expect(r.returnDate).toBe('2026-06-08');
  });

  it('yil oxiridan o\'tadi (1-yanvar bayrami)', () => {
    const r = calcLeave('2026-12-28', 7);
    expect(r.holidaysInRange).toEqual(['2027-01-01']);
    expect(r.endDate).toBe('2027-01-04');
  });

  it("noto'g'ri kunlar xato beradi", () => {
    expect(() => calcLeave('2026-06-01', 0)).toThrow();
  });
});

describe('workYear', () => {
  it('01.05.2026 qabul qilingan, 16.11.2026 ta\'til -> 01.05.2026–30.04.2027', () => {
    expect(workYear('2026-05-01', '2026-11-16')).toEqual({ start: '2026-05-01', end: '2027-04-30' });
  });
  it('sana yubileydan oldin bo\'lsa oldingi yil', () => {
    expect(workYear('2020-05-01', '2026-03-10')).toEqual({ start: '2025-05-01', end: '2026-04-30' });
  });
});

describe('workingDaysInMonth', () => {
  it('2026 dekabr: 23 kun - 8-dekabr bayrami (dushanba) = 22', () => {
    expect(workingDaysInMonth(2026, 12)).toBe(22);
  });
});
