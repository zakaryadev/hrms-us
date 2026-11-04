import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../app.module';
import { configureApp } from '../app.setup';
import { prepareTestDb } from './test-db';

jest.setTimeout(90_000);

describe('Taqvim API va hisoblarga ta\'siri (e2e)', () => {
  let app: INestApplication;
  let a: ReturnType<typeof request.agent>;
  let empId: string;

  beforeAll(async () => {
    await prepareTestDb('hrms_test_calendar');
    process.env.JWT_SECRET = 'test-secret-test-secret-123';
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    configureApp(app);
    await app.init();
    a = request.agent(app.getHttpServer());
    await a.post('/api/auth/setup').send({ login: 'admin', password: 'Parol-12345', fullName: 'Админ' }).expect(201);
    const dept = (await a.post('/api/departments').send({ name: 'Бўлим' }).expect(201)).body;
    const pos = (await a.post('/api/positions').send({ title: 'Мутахассис', departmentId: dept.id }).expect(201)).body;
    empId = (await a.post('/api/employees').send({
      tabNumber: '1', firstName: 'Али', lastName: 'Валиев', departmentId: dept.id, positionId: pos.id, salary: 6500000, hireDate: '2026-05-01',
    }).expect(201)).body.id;
  });
  afterAll(async () => { await app.close(); });

  const day = (body: any, date: string) => body.days.find((d: any) => d.date === date);

  it('autentifikatsiyasiz 401', async () => {
    await request(app.getHttpServer()).get('/api/calendar?year=2026').expect(401);
  });

  it("yil: 365 kun, o'rnatilgan bayram va hafta oxiri belgilari", async () => {
    const r = (await a.get('/api/calendar?year=2026').expect(200)).body;
    expect(r.days).toHaveLength(365);
    expect(r.configured).toBe(true);
    expect(day(r, '2026-12-08')).toMatchObject({ status: 'holiday', builtin: true, custom: null });
    expect(day(r, '2026-12-05').status).toBe('weekend');
    expect(day(r, '2026-12-07').status).toBe('work');
    expect((await a.get('/api/calendar?year=2024').expect(200)).body.days).toHaveLength(366);
  });

  it("noto'g'ri kiritish rad etiladi", async () => {
    await a.put('/api/calendar/2026-12-05').send({ kind: 'xato' }).expect(400);
    await a.put('/api/calendar/2026-13-45').send({ kind: 'holiday' }).expect(400);
    await a.put('/api/calendar/2026-02-30').send({ kind: 'holiday' }).expect(400);
    await a.put('/api/calendar/1999-01-01').send({ kind: 'holiday' }).expect(400);
    await a.get('/api/calendar?year=3000').expect(400);
  });

  it("ishchi shanba tabel va oylikka ta'sir qiladi, o'chirilganda qaytadi", async () => {
    const all = { '1': '8', '2': '8', '3': '8', '4': '8', '7': '8', '9': '8', '10': '8', '11': '8', '14': '8', '15': '8', '16': '8', '17': '8', '18': '8', '21': '8', '22': '8', '23': '8', '24': '8', '25': '8', '28': '8', '29': '8', '30': '8', '31': '8' };
    await a.put(`/api/timesheet/${empId}/2026/12`).send({ daysData: all }).expect(200);
    const row = async () => {
      const t = (await a.get('/api/timesheet?year=2026&month=12').expect(200)).body;
      return { t, r: t.rows.find((x: any) => x.employeeId === empId) };
    };
    let { r } = await row();
    expect(r.result.workingDays).toBe(22);
    expect(r.result.salary).toBe(6500000);

    await a.put('/api/calendar/2026-12-05').send({ kind: 'workday', note: 'Ишчи шанба' }).expect(200);
    let s = await row();
    expect(s.r.result.workingDays).toBe(23);
    expect(s.r.result.salary).toBe(Math.round(22 * (6500000 / 23)));
    expect(s.t.days[4]).toMatchObject({ day: 5, status: 'work', off: false });
    const cal = (await a.get('/api/calendar?year=2026')).body;
    expect(day(cal, '2026-12-05')).toMatchObject({ status: 'work', custom: 'workday', note: 'Ишчи шанба' });

    await a.delete('/api/calendar/2026-12-05').expect(200);
    s = await row();
    expect(s.r.result.workingDays).toBe(22);
    expect(s.t.days[4].status).toBe('weekend');
  });

  it("ta'til kalkulyatori taqvimga bo'ysunadi", async () => {
    const base = (await a.get(`/api/leave/calc?start=2026-11-16&days=27&hireDate=2026-05-01`).expect(200)).body;
    expect(base).toMatchObject({ endDate: '2026-12-13', returnDate: '2026-12-14', holidaysInRange: ['2026-12-08'] });
    await a.put('/api/calendar/2026-12-08').send({ kind: 'workday' }).expect(200);
    const changed = (await a.get(`/api/leave/calc?start=2026-11-16&days=27`).expect(200)).body;
    expect(changed).toMatchObject({ endDate: '2026-12-12', returnDate: '2026-12-14', holidaysInRange: [] });
    await a.delete('/api/calendar/2026-12-08').expect(200);
  });

  it("buyruq hujjati ham qo'lda belgilangan bayramni hisobga oladi", async () => {
    await a.put('/api/calendar/2026-11-20').send({ kind: 'holiday', note: 'Қўшимча байрам' }).expect(200);
    const r = await a.post('/api/documents/generate/buyruq-tatil').send({ employeeId: empId, params: { startDate: '2026-11-16', orderDate: '2026-11-04', lang: 'lat', save: false } }).expect(201);
    expect(r.headers['content-disposition']).toMatch(/buyruq-tatil/);
    await a.delete('/api/calendar/2026-11-20').expect(200);
  });

  it("hayit jadvali yo'q yil: ogohlantirish, belgilangach yo'qoladi", async () => {
    expect((await a.get('/api/timesheet?year=2028&month=3').expect(200)).body.holidaysWarning).toBe(true);
    expect((await a.get('/api/calendar?year=2028')).body.configured).toBe(false);
    await a.put('/api/calendar/2028-01-01').send({ kind: 'holiday' }).expect(200);
    expect((await a.get('/api/timesheet?year=2028&month=3')).body.holidaysWarning).toBe(false);
    expect((await a.get('/api/calendar?year=2028')).body.configured).toBe(true);
  });
});
