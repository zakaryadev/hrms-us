import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../app.module';
import { configureApp } from '../app.setup';
import { prepareTestDb } from './test-db';

jest.setTimeout(90_000);

describe("Ta'til buyrug'i → tabel va dashboard (e2e)", () => {
  let app: INestApplication;
  let a: ReturnType<typeof request.agent>;
  let empId: string;
  let otherId: string;

  beforeAll(async () => {
    await prepareTestDb('hrms_test_leave');
    process.env.JWT_SECRET = 'test-secret-test-secret-123';
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    configureApp(app);
    await app.init();
    a = request.agent(app.getHttpServer());
    await a.post('/api/auth/setup').send({ login: 'admin', password: 'Parol-12345', fullName: 'Админ' }).expect(201);
    const dept = (await a.post('/api/departments').send({ name: 'Бўлим' }).expect(201)).body;
    const pos = (await a.post('/api/positions').send({ title: 'Мутахассис', departmentId: dept.id }).expect(201)).body;
    const mk = async (n: string) => (await a.post('/api/employees').send({ tabNumber: n, firstName: 'Али', lastName: 'Вали' + n, departmentId: dept.id, positionId: pos.id, salary: 6500000, hireDate: '2026-05-01' }).expect(201)).body.id;
    empId = await mk('1'); otherId = await mk('2');
  });
  afterAll(async () => { await app.close(); });

  const sheet = async (year: number, month: number, id = empId) => {
    const t = (await a.get(`/api/timesheet?year=${year}&month=${month}`).expect(200)).body;
    return t.rows.find((r: any) => r.employeeId === id);
  };
  const gen = (params: any, id = empId) => a.post('/api/documents/generate/buyruq-tatil').send({ employeeId: id, params: { orderDate: '2026-11-04', lang: 'lat', ...params } });

  it("saqlangan buyruq ta'til oralig'idagi ish kunlariga MT qo'yadi (ikki oy, bayram bo'sh qoladi)", async () => {
    await a.post('/api/timesheet/autofill').send({ year: 2026, month: 11 }).expect(201);
    await a.post('/api/timesheet/autofill').send({ year: 2026, month: 12 }).expect(201);
    // oldindan kasallik varaqasi: 17-noyabr — MT bilan almashtirilmasligi kerak
    const nov = (await sheet(2026, 11)).daysData;
    await a.put(`/api/timesheet/${empId}/2026/11`).send({ daysData: { ...nov, '17': 'KV' } }).expect(200);

    const r = await gen({ startDate: '2026-11-16' }).expect(201);   // 27 kun, 8-dekabr bayram: 16.11 — 13.12
    expect(r.body.number).toMatch(/^T-/);

    const n = await sheet(2026, 11);
    const MT = (d: string) => n.daysData[d];
    expect(MT('16')).toBe('MT'); expect(MT('18')).toBe('MT'); expect(MT('20')).toBe('MT'); expect(MT('23')).toBe('MT'); expect(MT('30')).toBe('MT');
    expect(MT('17')).toBe('KV');                 // saqlandi
    expect(MT('21')).toBeUndefined();            // shanba — bo'sh
    expect(MT('13')).toBe('8');                  // ta'tilgacha — o'zgarmadi
    const d = await sheet(2026, 12);
    expect(d.daysData['1']).toBe('MT'); expect(d.daysData['4']).toBe('MT'); expect(d.daysData['7']).toBe('MT'); expect(d.daysData['11']).toBe('MT');
    expect(d.daysData['8']).toBeUndefined();     // bayram — bo'sh
    expect(d.daysData['14']).toBe('8');          // ta'til tugagach
    expect(d.result.leaveDays).toBe(8);          // 1,2,3,4,7,9,10,11
    // MT oylikka qo'shilmaydi: 22 ish kunidan 14 ishlangan
    expect(d.result.workedDays).toBe(14);
    expect(d.result.salary).toBe(Math.round(14 * (6500000 / 22)));
  });

  it("boshqa xodimning tabeliga tegmaydi", async () => {
    const o = await sheet(2026, 12, otherId);
    expect(Object.values(o.daysData).includes('MT')).toBe(false);
  });

  it('save:false (faylni saqlamasdan olish) tabelni o\'zgartirmaydi', async () => {
    await a.post('/api/timesheet/autofill').send({ year: 2027, month: 2 }).expect(201);
    await gen({ startDate: '2027-02-01', save: false }).expect(201);
    const s = await sheet(2027, 2, empId);
    expect(Object.values(s.daysData).includes('MT')).toBe(false);
  });

  it('dashboard: bugun ta\'til buyrug\'i oralig\'ida bo\'lgan xodim "Таътилдагилар"ga kiradi', async () => {
    expect((await a.get('/api/dashboard/stats').expect(200)).body.onLeave).toBe(0);
    const today = new Date().toISOString().slice(0, 10);
    await gen({ startDate: today, basicDays: 5, extraDays: 0 }, otherId).expect(201);
    expect((await a.get('/api/dashboard/stats').expect(200)).body.onLeave).toBe(1);
    // arxivdagi xodim hisoblanmaydi
    await a.patch(`/api/employees/${otherId}`).send({ status: 'ishdan_boshagan' }).expect(200);
    expect((await a.get('/api/dashboard/stats').expect(200)).body.onLeave).toBe(0);
  });

  it("o'tgan va kelajakdagi ta'til buyruqlari \"Таътилдагилар\"ga kirmaydi", async () => {
    await a.patch(`/api/employees/${otherId}`).send({ status: 'ishlamoqda' }).expect(200);
    expect((await a.get('/api/dashboard/stats').expect(200)).body.onLeave).toBe(1); // faqat bugungi buyruq
    await gen({ startDate: '2026-05-04', basicDays: 5, extraDays: 0 }, empId).expect(201);   // o'tgan
    await gen({ startDate: '2031-05-05', basicDays: 5, extraDays: 0 }, empId).expect(201);   // kelajak
    const st = (await a.get('/api/dashboard/stats').expect(200)).body;
    expect(st.onLeave).toBe(1);
    expect(st.totalEmployees).toBe(2);
  });
});
