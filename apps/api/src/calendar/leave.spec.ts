import { dayStatus, workingDaysInMonth } from './holidays';
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

describe('taqvim: qo\'shimcha holatlar', () => {
  it('2026: Ramazon hayit (20.03) + Navro\'z (21.03) ketma-ket — ta\'til 2 kunga uzayadi, qaytish dushanba', () => {
    const r = calcLeave('2026-03-16', 5); // du-pa: 16,17,18,19, keyin 20-21 bayram, 22-yakshanba 5-kun
    expect(r.holidaysInRange).toEqual(['2026-03-20', '2026-03-21']);
    expect(r.endDate).toBe('2026-03-22');
    expect(r.returnDate).toBe('2026-03-23');
  });

  it('shanbadan boshlangan ta\'til: dam olish kunlari ta\'til kuniga kiradi', () => {
    const r = calcLeave('2026-06-06', 3); // shanba, yakshanba, dushanba
    expect(r.endDate).toBe('2026-06-08');
    expect(r.returnDate).toBe('2026-06-09');
  });

  it("Qurbon hayit (27.05.2026) ta'til oralig'ida", () => {
    const r = calcLeave('2026-05-25', 3);
    expect(r.holidaysInRange).toEqual(['2026-05-27']);
    expect(r.endDate).toBe('2026-05-28');
  });

  it("tugash kuni juma bo'lib, dushanba bayram bo'lsa — ishga chiqish keyingi ish kuni", () => {
    // 2026-12-04 (juma) 1 kunlik ta'til: tugash 04.12, qaytish dushanba 07.12 (8-dekabr seshanba — ish kuni emas, lekin 7-si ish kuni)
    expect(calcLeave('2026-12-04', 1).returnDate).toBe('2026-12-07');
    // 2026-12-07 (dushanba) 1 kun: qaytish 8-dekabr bayram → 9-dekabr
    expect(calcLeave('2026-12-07', 1).returnDate).toBe('2026-12-09');
  });

  it('ish kunlari: may 2026 = 20 (Qurbon hayit chiqariladi; shanbaga tushgan 9-may ko\'chirilmaydi)', () => {
    expect(workingDaysInMonth(2026, 5)).toBe(20);
  });

  it('hayit jadvali yo\'q yilda faqat doimiy bayramlar hisobga olinadi', () => {
    expect(workingDaysInMonth(2027, 3)).toBe(22); // 23 ish kuni − 8-mart (dushanba); 21-mart yakshanba; hayit sanalari kiritilmagan
  });
});

describe('qo\'lda belgilangan kunlar (overrides)', () => {
  const D = (iso: string) => new Date(iso + 'T00:00:00Z');

  it('dayStatus: ustuvorlik — qo\'lda > o\'rnatilgan bayram > hafta oxiri', () => {
    expect(dayStatus(D('2026-12-08'))).toBe('holiday');                          // o'rnatilgan
    expect(dayStatus(D('2026-12-08'), { '2026-12-08': 'workday' })).toBe('work'); // ishchi kun deb belgilangan
    expect(dayStatus(D('2026-12-05'))).toBe('weekend');                           // shanba
    expect(dayStatus(D('2026-12-05'), { '2026-12-05': 'workday' })).toBe('work'); // ishchi shanba
    expect(dayStatus(D('2026-12-14'), { '2026-12-14': 'dayoff' })).toBe('dayoff');
    expect(dayStatus(D('2026-12-14'), { '2026-12-14': 'holiday' })).toBe('holiday');
  });

  it('workingDaysInMonth: ishchi shanba qo\'shadi, ko\'chirilgan dam olish va yangi bayram kamaytiradi', () => {
    expect(workingDaysInMonth(2026, 12)).toBe(22);
    expect(workingDaysInMonth(2026, 12, { '2026-12-05': 'workday' })).toBe(23);
    expect(workingDaysInMonth(2026, 12, { '2026-12-14': 'dayoff' })).toBe(21);
    expect(workingDaysInMonth(2026, 12, { '2026-12-14': 'holiday' })).toBe(21);
    expect(workingDaysInMonth(2026, 12, { '2026-12-08': 'workday' })).toBe(23);
  });

  it("ko'chirilgan dam olish ta'tilni uzaytirmaydi, qo'shimcha bayram uzaytiradi", () => {
    const base = calcLeave('2026-06-01', 10); // 1..10-iyun, bayram yo'q
    expect(base.endDate).toBe('2026-06-10');
    const dayoff = calcLeave('2026-06-01', 10, { '2026-06-03': 'dayoff' });
    expect(dayoff.endDate).toBe('2026-06-10');
    expect(dayoff.holidaysInRange).toEqual([]);
    const hol = calcLeave('2026-06-01', 10, { '2026-06-03': 'holiday' });
    expect(hol.endDate).toBe('2026-06-11');
    expect(hol.holidaysInRange).toEqual(['2026-06-03']);
  });

  it("8-dekabr ishchi kun deb belgilansa, ta'til uzaymaydi", () => {
    const r = calcLeave('2026-11-16', 27, { '2026-12-08': 'workday' });
    expect(r.holidaysInRange).toEqual([]);
    expect(r.endDate).toBe('2026-12-12');
    expect(r.returnDate).toBe('2026-12-14'); // 12-shanba, 13-yakshanba
  });

  it("qaytish sanasi ko'chirilgan dam olish kuniga to'g'ri kelsa — keyingi ish kuni", () => {
    const r = calcLeave('2026-06-01', 5, { '2026-06-08': 'dayoff' }); // 1..5-iyun, 6-7 hafta oxiri, 8 ko'chirilgan
    expect(r.returnDate).toBe('2026-06-09');
  });
});
