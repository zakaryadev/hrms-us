import { buildSeries, delta, lastMonths } from './dashboard.metrics';

describe('lastMonths', () => {
  it('12 oy, eskidan yangiga, yil almashganda to\'g\'ri', () => {
    const m = lastMonths(12, new Date('2026-02-10T00:00:00Z'));
    expect(m).toHaveLength(12);
    expect(m[0]).toMatchObject({ key: '2025-03', label: 'Мар', endIso: '2025-03-31' });
    expect(m[10]).toMatchObject({ key: '2026-01', endIso: '2026-01-31' });
    expect(m[11]).toMatchObject({ key: '2026-02', label: 'Фев', endIso: '2026-02-28' });
  });
  it('kabisa yili fevrali 29 kun', () => {
    expect(lastMonths(1, new Date('2028-02-01T00:00:00Z'))[0].endIso).toBe('2028-02-29');
  });
});

describe('buildSeries', () => {
  const months = lastMonths(4, new Date('2026-11-04T00:00:00Z')); // 2026-08 … 2026-11
  const emps = [
    { hireIso: '2020-01-10', shtat: true },
    { hireIso: '2026-09-05', shtat: true },
    { hireIso: '2026-09-20', shtat: false },
    { hireIso: '2026-11-02', shtat: true },
  ];
  const s = buildSeries(emps, ['2026-10-15', '2026-11-01', '2026-11-20'], 5, months);

  it('ishlayotganlar soni oy oxiri bo\'yicha kumulyativ', () => { expect(s.headcount).toEqual([1, 3, 3, 4]); });
  it('shtatdagilar, bo\'sh shtat va band foizi', () => {
    expect(s.occupied).toEqual([1, 2, 2, 3]);
    expect(s.vacant).toEqual([4, 3, 3, 2]);
    expect(s.occupancy).toEqual([20, 40, 40, 60]);
  });
  it('har oy qabul va boshlangan ta\'tillar', () => {
    expect(s.hires).toEqual([0, 2, 0, 1]);
    expect(s.leaves).toEqual([0, 0, 1, 2]);
  });
  it('shtat 0 bo\'lsa foiz 0 (nolga bo\'lish yo\'q)', () => {
    expect(buildSeries(emps, [], 0, months).occupancy).toEqual([0, 0, 0, 0]);
  });
  it('delta: oxirgi ikki oy farqi', () => {
    expect(delta(s.headcount)).toBe(1);
    expect(delta(s.vacant)).toBe(-1);
    expect(delta([5])).toBe(0);
  });
});
