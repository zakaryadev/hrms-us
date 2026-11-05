import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { existsSync } from 'fs';
import { join } from 'path';
import request from 'supertest';
import { AppModule } from '../app.module';
import { configureApp } from '../app.setup';
import { GENERATED_DIR } from '../docx/documents.service';
import { prepareTestDb } from './test-db';

jest.setTimeout(90_000);

describe('Rollar, xodimni o\'chirish, hujjat o\'chirish va audit jurnali (e2e)', () => {
  let app: INestApplication;
  const agent = () => request.agent(app.getHttpServer());
  let a: ReturnType<typeof agent>, hr: ReturnType<typeof agent>, acc: ReturnType<typeof agent>;
  let empId: string, freeId: string, deptId: string, posId: string;

  beforeAll(async () => {
    await prepareTestDb('hrms_test_roles');
    process.env.JWT_SECRET = 'test-secret-test-secret-123';
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    configureApp(app);
    await app.init();
    a = agent(); hr = agent(); acc = agent();
    await a.post('/api/auth/setup').send({ login: 'admin', password: 'Parol-12345', fullName: 'Админ' }).expect(201);
    await a.post('/api/users').send({ login: 'hr', fullName: 'Кадр', role: 'kadrlar', password: 'Kadr-12345' }).expect(201);
    await a.post('/api/users').send({ login: 'acc', fullName: 'Бухг', role: 'buxgalter', password: 'Buxg-12345' }).expect(201);
    await hr.post('/api/auth/login').send({ login: 'hr', password: 'Kadr-12345' }).expect(200);
    await acc.post('/api/auth/login').send({ login: 'acc', password: 'Buxg-12345' }).expect(200);
    const dept = (await a.post('/api/departments').send({ name: 'Бўлим' }).expect(201)).body;
    const pos = (await a.post('/api/positions').send({ title: 'Мутахассис', departmentId: dept.id }).expect(201)).body;
    deptId = dept.id; posId = pos.id;
    const mk = async (n: string) => (await a.post('/api/employees').send({ tabNumber: n, firstName: 'Али', lastName: 'Вали' + n, departmentId: deptId, positionId: posId, salary: 6500000, hireDate: '2026-05-01' }).expect(201)).body.id;
    empId = await mk('1'); freeId = await mk('2');
  });
  afterAll(async () => { await app.close(); });

  it('buxgalter: hammasini ko\'radi, faqat tabelni o\'zgartiradi', async () => {
    await acc.get('/api/employees').expect(200);
    await acc.post('/api/employees').send({}).expect(403);
    await acc.patch(`/api/employees/${empId}`).send({ salary: 1 }).expect(403);
    await acc.post(`/api/documents/generate/obyektivka`).send({ employeeId: empId }).expect(403);
    await acc.put('/api/settings').send({}).expect(403);
    await acc.post('/api/timesheet/autofill').send({ year: 2026, month: 11 }).expect(201);
    await acc.post('/api/auth/change-password').send({ currentPassword: 'x', newPassword: 'y' }).expect((r) => { if (r.status === 403) throw new Error('change-password bloklanmasligi kerak'); });
  });

  it('kadrlar: ishlaydi, lekin sozlamalar va xodimni o\'chirish yo\'q', async () => {
    await hr.patch(`/api/employees/${empId}`).send({ salary: 7000000 }).expect(200);
    await hr.put('/api/settings').send({}).expect(403);
    await hr.delete(`/api/employees/${freeId}`).expect(403);
    await hr.get('/api/audit').expect(403);
    await acc.get('/api/audit').expect(403);
  });

  it('hujjat/buyruqni o\'chirish fayl va bog\'langan yozuvni ham o\'chiradi', async () => {
    const gen = await hr.post('/api/documents/generate/buyruq-tatil').send({ employeeId: empId, params: { orderDate: '2026-11-04', startDate: '2026-11-16', lang: 'lat' } }).expect(201);
    const list = (await hr.get(`/api/employees/${empId}/generated`).expect(200)).body;
    const doc = list.find((d: any) => d.id === gen.body.id);
    const file = join(GENERATED_DIR, doc.filePath);
    expect(existsSync(file)).toBe(true);
    expect((await hr.get('/api/orders').expect(200)).body.length).toBe(1);
    await hr.delete(`/api/documents/generated/${gen.body.id}`).expect(204);
    expect(existsSync(file)).toBe(false);
    expect((await hr.get('/api/orders').expect(200)).body.length).toBe(0);
    await hr.delete(`/api/documents/generated/${gen.body.id}`).expect(404);
  });

  it('buyruqni o\'chirish ham hujjat yozuvini olib tashlaydi', async () => {
    await hr.post('/api/documents/generate/buyruq-tatil').send({ employeeId: empId, params: { orderDate: '2026-11-04', startDate: '2026-12-14', lang: 'lat' } }).expect(201);
    const o = (await hr.get('/api/orders').expect(200)).body[0];
    await hr.delete(`/api/orders/${o.id}`).expect(204);
    expect((await hr.get(`/api/employees/${empId}/generated`).expect(200)).body.length).toBe(0);
  });

  it('xodimni o\'chirish: faqat superadmin; buyrug\'i bor xodim o\'chmaydi', async () => {
    await hr.post('/api/documents/generate/buyruq-tatil').send({ employeeId: empId, params: { orderDate: '2026-11-04', startDate: '2027-03-01', lang: 'lat' } }).expect(201);
    const r = await a.delete(`/api/employees/${empId}`).expect(400);
    expect(r.body.message).toMatch(/Архив/);
    await a.delete(`/api/employees/${freeId}`).expect(200);
    await a.delete(`/api/employees/${freeId}`).expect(404);
  });

  it('audit jurnali: kim nima qilgani yoziladi, parol yozilmaydi', async () => {
    await agent().post('/api/auth/login').send({ login: 'hr', password: 'noto\'g\'ri-parol' }).expect(401);
    const j = (await a.get('/api/audit?page=1').expect(200)).body;
    expect(j.total).toBeGreaterThan(5);
    const del = j.items.find((x: any) => x.action === 'delete' && x.entity === 'employees');
    expect(del.userLogin).toBe('admin');
    expect(del.summary).toMatch(/Ходим бутунлай ўчирилди/);
    const docDel = j.items.find((x: any) => x.entity === 'documents' && x.action === 'delete');
    expect(docDel.userLogin).toBe('hr');
    expect(docDel.summary).toMatch(/Ҳужжат ўчирилди/);
    expect(j.items.some((x: any) => x.action === 'login_failed' && x.userLogin === 'hr')).toBe(true);
    // рад этилган (403) сўровлар журналга тушмайди
    expect(j.items.some((x: any) => x.userLogin === 'acc' && x.entity === 'employees')).toBe(false);
    expect(JSON.stringify(j)).not.toMatch(/Parol-12345|Kadr-12345|noto'g'ri-parol/);
    const f = (await a.get('/api/audit?entity=users').expect(200)).body;
    expect(f.items.every((x: any) => x.entity === 'users')).toBe(true);
  });
});
