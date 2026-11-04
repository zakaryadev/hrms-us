import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../app.module';
import { configureApp } from '../app.setup';
import { prepareTestDb } from './test-db';

jest.setTimeout(90_000);

describe('Bo\'lim va lavozim tahriri (e2e)', () => {
  let app: INestApplication;
  let a: ReturnType<typeof request.agent>;

  beforeAll(async () => {
    await prepareTestDb('hrms_test_structure');
    process.env.JWT_SECRET = 'test-secret-test-secret-123';
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    configureApp(app);
    await app.init();
    a = request.agent(app.getHttpServer());
    await a.post('/api/auth/setup').send({ login: 'admin', password: 'Parol-12345', fullName: 'Админ' }).expect(201);
  });
  afterAll(async () => { await app.close(); });

  it("bo'lim daraxtida sikl taqiqlanadi, nomni o'zgartirish va yuqori bo'limdan chiqarish mumkin", async () => {
    const A = (await a.post('/api/departments').send({ name: 'Вилоят' }).expect(201)).body;
    const B = (await a.post('/api/departments').send({ name: 'Шаҳар', parentId: A.id }).expect(201)).body;
    const C = (await a.post('/api/departments').send({ name: 'Туман', parentId: B.id }).expect(201)).body;

    await a.patch(`/api/departments/${A.id}`).send({ parentId: A.id }).expect(400);        // o'ziga
    await a.patch(`/api/departments/${A.id}`).send({ parentId: C.id }).expect(400);        // nevarasiga (A→B→C)
    const r = await a.patch(`/api/departments/${A.id}`).send({ parentId: C.id });
    expect(r.body.message).toMatch(/қуйи бўлимига/);

    await a.patch(`/api/departments/${C.id}`).send({ name: 'Туман (янги)', code: 'T1' }).expect(200);
    const cleared = await a.patch(`/api/departments/${B.id}`).send({ parentId: null }).expect(200);
    expect(cleared.body.parentId).toBeNull();
    await a.patch(`/api/departments/${C.id}`).send({ parentId: A.id }).expect(200);        // boshqa shoxga ko'chirish
    await a.patch('/api/departments/not-a-uuid').send({ name: 'x' }).expect(400);
  });

  it('lavozim: validatsiya, tahrir, band/shtat hisobi, boshqa bo\'limga ko\'chirish cheklovi', async () => {
    const D1 = (await a.post('/api/departments').send({ name: 'Бўлим-1' }).expect(201)).body;
    const D2 = (await a.post('/api/departments').send({ name: 'Бўлим-2' }).expect(201)).body;
    await a.post('/api/positions').send({ title: 'Нотўғри', departmentId: D1.id, staffCount: 0 }).expect(400);
    await a.post('/api/positions').send({ title: 'Нотўғри', departmentId: D1.id, baseSalary: -5 }).expect(400);
    const P = (await a.post('/api/positions').send({ title: 'Мутахассис', departmentId: D1.id, staffCount: 2, baseSalary: 5000000 }).expect(201)).body;

    await a.patch(`/api/positions/${P.id}`).send({ title: 'Етакчи мутахассис', staffCount: 3, baseSalary: 6000000 }).expect(200);
    const emp = (n: string, status?: string) => a.post('/api/employees').send({ tabNumber: n, firstName: 'Али', lastName: 'Вали' + n, departmentId: D1.id, positionId: P.id, ...(status && { status }) }).expect(201);
    await emp('1'); await emp('2'); await emp('3', 'ishdan_boshagan');

    const list = (await a.get(`/api/positions?departmentId=${D1.id}`).expect(200)).body;
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ title: 'Етакчи мутахассис', staffCount: 3, occupied: 2 }); // arxivdagi hisoblanmaydi

    const move = await a.patch(`/api/positions/${P.id}`).send({ departmentId: D2.id }).expect(400);
    expect(move.body.message).toMatch(/кўчириб бўлмайди/);

    const empty = (await a.post('/api/positions').send({ title: 'Бўш лавозим', departmentId: D1.id }).expect(201)).body;
    await a.patch(`/api/positions/${empty.id}`).send({ departmentId: D2.id }).expect(200);   // xodimsiz — mumkin
  });

  it("bog'liq yozuvi bor bo'limni o'chirish tushunarli xabar bilan 400", async () => {
    const D = (await a.post('/api/departments').send({ name: 'Ўчириладиган' }).expect(201)).body;
    await a.post('/api/positions').send({ title: 'Лавозим', departmentId: D.id }).expect(201);
    const r = await a.delete(`/api/departments/${D.id}`).expect(400);
    expect(r.body.message).toMatch(/ўчириб бўлмайди/);
  });
});
