import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../app.module';
import { configureApp } from '../app.setup';
import { prepareTestDb } from './test-db';

jest.setTimeout(90_000);

describe('Dashboard statistikasi (e2e)', () => {
  let app: INestApplication;
  let a: ReturnType<typeof request.agent>;
  const ids: Record<string, string> = {};

  beforeAll(async () => {
    await prepareTestDb('hrms_test_dashboard');
    process.env.JWT_SECRET = 'test-secret-test-secret-123';
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    configureApp(app);
    await app.init();
    a = request.agent(app.getHttpServer());
    await a.post('/api/auth/setup').send({ login: 'admin', password: 'Parol-12345', fullName: 'Админ' }).expect(201);
    const d1 = (await a.post('/api/departments').send({ name: 'Биринчи бўлим' }).expect(201)).body;
    const d2 = (await a.post('/api/departments').send({ name: 'Иккинчи бўлим' }).expect(201)).body;
    const p1 = (await a.post('/api/positions').send({ title: 'Мутахассис', departmentId: d1.id, staffCount: 4 }).expect(201)).body;
    const p2 = (await a.post('/api/positions').send({ title: 'Менежер', departmentId: d2.id, staffCount: 2 }).expect(201)).body;
    const mk = async (n: string, dep: any, pos: any, extra: object) => (await a.post('/api/employees').send({ tabNumber: n, firstName: 'Исм' + n, lastName: 'Фамилия' + n, departmentId: dep.id, positionId: pos.id, ...extra }).expect(201)).body.id;
    const now = new Date(); const monthsAgo = (k: number) => new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - k, 5)).toISOString().slice(0, 10);
    ids.a = await mk('1', d1, p1, { hireDate: '2018-03-01' });
    ids.b = await mk('2', d1, p1, { hireDate: monthsAgo(3) });
    ids.c = await mk('3', d2, p2, { hireDate: monthsAgo(1) });
    ids.g = await mk('4', d2, p2, { hireDate: monthsAgo(1), employmentType: 'gpx' });
    ids.x = await mk('5', d1, p1, { hireDate: monthsAgo(2), status: 'ishdan_boshagan' }); // arxivdagi hisoblanmaydi
    await a.post('/api/documents/generate/buyruq-tatil').send({ employeeId: ids.a, params: { startDate: now.toISOString().slice(0, 10), orderDate: now.toISOString().slice(0, 10), basicDays: 5, extraDays: 0, lang: 'lat' } }).expect(201);
  });
  afterAll(async () => { await app.close(); });

  it('autentifikatsiyasiz 401', async () => { await request(app.getHttpServer()).get('/api/dashboard/stats').expect(401); });

  it('asosiy ko\'rsatkichlar: arxivdagi xodim hisoblanmaydi, GPX alohida', async () => {
    const s = (await a.get('/api/dashboard/stats').expect(200)).body;
    expect(s).toMatchObject({ totalStaff: 6, totalEmployees: 4, occupiedStaff: 3, vacantStaff: 3, gpx: 1, onLeave: 1 });
  });

  it('12 oylik qatorlar: uzunlik, oxirgi qiymat joriy holatga teng, qabul va ta\'tillar', async () => {
    const s = (await a.get('/api/dashboard/stats')).body;
    expect(s.months).toHaveLength(12);
    for (const k of ['headcount', 'occupied', 'hires', 'leaves', 'vacant', 'occupancy']) expect(s.series[k]).toHaveLength(12);
    expect(s.series.headcount[11]).toBe(s.totalEmployees);
    expect(s.series.occupied[11]).toBe(s.occupiedStaff);
    expect(s.series.vacant[11]).toBe(s.vacantStaff);
    expect(s.series.headcount[0]).toBe(1);                       // 12 oy oldin faqat 2018 yilda qabul qilingan
    expect(s.series.hires.reduce((x: number, y: number) => x + y, 0)).toBe(3);   // oxirgi 12 oyda qabul: b, c, g
    expect(s.series.hires[10]).toBe(2);                          // o'tgan oy: c, g
    expect(s.series.leaves[11]).toBe(1);                         // shu oy boshlangan ta'til
    expect(s.series.headcount.every((v: number, i: number, arr: number[]) => i === 0 || v >= arr[i - 1])).toBe(true);
    expect(s.deltas).toMatchObject({ headcount: 0, hires: -2, leaves: 1 });
  });

  it('bo\'limlar bo\'yicha taqsimot yig\'indisi ishlayotganlarga teng, kamayish tartibida', async () => {
    const s = (await a.get('/api/dashboard/stats')).body;
    expect(s.distribution.reduce((x: number, d: any) => x + d.count, 0)).toBe(s.totalEmployees);
    expect(s.distribution.map((d: any) => d.count)).toEqual([...s.distribution.map((d: any) => d.count)].sort((x, y) => y - x));
    expect(s.distribution[0]).toMatchObject({ count: 2 });
  });

  it('so\'nggi buyruqlar va hodisalar lentasi', async () => {
    const s = (await a.get('/api/dashboard/stats')).body;
    expect(s.recentOrders).toHaveLength(1);
    expect(s.recentOrders[0]).toMatchObject({ orderType: 'tatil_berish', typeLabel: 'Меҳнат таътили' });
    expect(s.recentOrders[0].employee.fullName).toContain('Фамилия1');
    expect(s.activity.length).toBeGreaterThan(0);
    expect(s.activity.length).toBeLessThanOrEqual(6);
    const times = s.activity.map((x: any) => new Date(x.at).getTime());
    expect(times).toEqual([...times].sort((x, y) => y - x));
    expect(s.activity.map((x: any) => x.kind)).toEqual(expect.arrayContaining(['employee', 'order', 'document']));
  });
});
