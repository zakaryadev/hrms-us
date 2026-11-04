import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { configureApp } from '../app.setup';
import { AppModule } from '../app.module';
import { AuthService } from '../auth/auth.service';
import { prepareTestDb } from './test-db';

jest.setTimeout(90_000);

describe('Auth va rollar (e2e)', () => {
  let app: INestApplication;
  let auth: AuthService;
  let a: ReturnType<typeof request.agent>;
  let hr: ReturnType<typeof request.agent>;
  const http = () => request(app.getHttpServer());
  const ADMIN = { login: 'admin', password: 'Parol-12345', fullName: 'Бош Админ' };

  beforeAll(async () => {
    await prepareTestDb();
    process.env.JWT_SECRET = 'test-secret-test-secret-123';
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    configureApp(app);
    await app.init();
    auth = app.get(AuthService);
    a = request.agent(app.getHttpServer());
    hr = request.agent(app.getHttpServer());
  });
  afterAll(async () => { await app.close(); });

  const admin = () => request.agent(app.getHttpServer());

  it('health ochiq, himoyalangan yo\'llar autentifikatsiyasiz 401', async () => {
    await http().get('/api/health').expect(200);
    await http().get('/api/employees').expect(401);
    await http().get('/api/dashboard/stats').expect(401);
    await http().get('/api/users').expect(401);
  });

  it('boshida setup kerak', async () => {
    const r = await http().get('/api/auth/setup-status').expect(200);
    expect(r.body).toEqual({ needsSetup: true });
  });

  it('setup: kuchsiz parol va noto\'g\'ri login rad etiladi', async () => {
    await http().post('/api/auth/setup').send({ ...ADMIN, password: '123' }).expect(400);
    await http().post('/api/auth/setup').send({ ...ADMIN, login: 'a b' }).expect(400);
    expect((await http().get('/api/auth/setup-status')).body.needsSetup).toBe(true);
  });

  it('setup: superadmin yaratadi, httpOnly cookie beradi, parol qaytmaydi', async () => {
    const r = await a.post('/api/auth/setup').send(ADMIN).expect(201);
    expect(r.body).toMatchObject({ login: 'admin', role: 'superadmin' });
    expect(JSON.stringify(r.body)).not.toMatch(/password|hash/i);
    const cookie = String(r.headers['set-cookie']);
    expect(cookie).toMatch(/hrms_token=/);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Lax/i);
  });

  it('setup ikkinchi marta ishlamaydi (concurrent ham)', async () => {
    await http().post('/api/auth/setup').send({ ...ADMIN, login: 'hacker' }).expect(403);
    expect((await http().get('/api/auth/setup-status')).body.needsSetup).toBe(false);
  });

  it('me: cookie bilan ishlaydi, cookiesiz 401', async () => {
    expect((await a.get('/api/auth/me').expect(200)).body).toMatchObject({ login: 'admin', role: 'superadmin' });
    await http().get('/api/auth/me').expect(401);
  });

  it('superadmin foydalanuvchi yaratadi; takroriy login 409; qisqa parol 400', async () => {
    await a.post('/api/users').send({ login: 'hr', fullName: 'Кадрлар Ходими', role: 'kadrlar', password: 'Kadr-12345' }).expect(201);
    await a.post('/api/users').send({ login: 'HR', fullName: 'Яна', role: 'kadrlar', password: 'Kadr-12345' }).expect(409);
    await a.post('/api/users').send({ login: 'x1', fullName: 'Яна', role: 'kadrlar', password: 'qisqa' }).expect(400);
    await a.post('/api/users').send({ login: 'x2', fullName: 'Яна', role: 'xato-rol', password: 'Kadr-12345' }).expect(400);
    const list = (await a.get('/api/users').expect(200)).body;
    expect(list).toHaveLength(2);
    expect(JSON.stringify(list)).not.toMatch(/password|hash/i);
  });

  it('kadrlar: ishlaydi, lekin /users ga kira olmaydi (403)', async () => {
    await hr.post('/api/auth/login').send({ login: 'HR', password: 'Kadr-12345' }).expect(200);
    await hr.get('/api/employees').expect(200);
    await hr.get('/api/timesheet?year=2026&month=12').expect(200);
    await hr.get('/api/users').expect(403);
    await hr.post('/api/users').send({ login: 'x3', fullName: 'Яна', role: 'kadrlar', password: 'Kadr-12345' }).expect(403);
  });

  it('buxgalter ham hamma bo\'limga kira oladi (bir xil huquq), /users ga yo\'q', async () => {
    await a.post('/api/users').send({ login: 'acc', fullName: 'Бухгалтер', role: 'buxgalter', password: 'Buxg-12345' }).expect(201);
    const acc = admin();
    await acc.post('/api/auth/login').send({ login: 'acc', password: 'Buxg-12345' }).expect(200);
    await acc.get('/api/employees').expect(200);
    await acc.get('/api/orders').expect(200);
    await acc.get('/api/users').expect(403);
  });

  it('oxirgi faol superadminni tushirib/o\'chirib bo\'lmaydi', async () => {
    const me = (await a.get('/api/auth/me')).body;
    await a.patch(`/api/users/${me.id}`).send({ role: 'kadrlar' }).expect(400);
    await a.patch(`/api/users/${me.id}`).send({ active: false }).expect(400);
    // ikkinchi superadmin bo'lsa mumkin
    const second = (await a.post('/api/users').send({ login: 'admin2', fullName: 'Иккинчи', role: 'superadmin', password: 'Admin2-12345' }).expect(201)).body;
    await a.patch(`/api/users/${second.id}`).send({ active: false }).expect(200);
    await a.patch(`/api/users/${second.id}`).send({ active: true }).expect(200);
  });

  it('nofaol qilingan foydalanuvchining joriy sessiyasi darhol tugaydi', async () => {
    const users = (await a.get('/api/users')).body;
    const hrUser = users.find((u: any) => u.login === 'hr');
    await a.patch(`/api/users/${hrUser.id}`).send({ active: false }).expect(200);
    await hr.get('/api/employees').expect(401);
    await http().post('/api/auth/login').send({ login: 'hr', password: 'Kadr-12345' }).expect(401);
  });

  it('login: noto\'g\'ri parol va mavjud bo\'lmagan login bir xil xabar', async () => {
    const bad = await http().post('/api/auth/login').send({ login: 'admin', password: 'noto\'g\'ri' }).expect(401);
    const none = await http().post('/api/auth/login').send({ login: 'yoq-odam', password: 'noto\'g\'ri' }).expect(401);
    expect(bad.body.message).toBe(none.body.message);
  });

  it('login cheklovi: 5 xatodan keyin to\'g\'ri parol bilan ham 429', async () => {
    auth.resetThrottle();
    for (let i = 0; i < 5; i++) await http().post('/api/auth/login').send({ login: 'admin', password: 'xato-xato' }).expect(401);
    await http().post('/api/auth/login').send({ login: 'admin', password: ADMIN.password }).expect(429);
    auth.resetThrottle();
    await http().post('/api/auth/login').send({ login: 'admin', password: ADMIN.password }).expect(200);
  });

  it('parolni o\'zgartirish: eski parol shart, yangisi ishlaydi', async () => {
    const u = admin();
    await u.post('/api/auth/login').send({ login: 'admin', password: ADMIN.password }).expect(200);
    await u.post('/api/auth/change-password').send({ oldPassword: 'xato', newPassword: 'Yangi-12345' }).expect(400);
    await u.post('/api/auth/change-password').send({ oldPassword: ADMIN.password, newPassword: '123' }).expect(400);
    await u.post('/api/auth/change-password').send({ oldPassword: ADMIN.password, newPassword: 'Yangi-12345' }).expect(200);
    await http().post('/api/auth/login').send({ login: 'admin', password: ADMIN.password }).expect(401);
    await http().post('/api/auth/login').send({ login: 'admin', password: 'Yangi-12345' }).expect(200);
  });

  it('logout cookie ni tozalaydi', async () => {
    const u = admin();
    await u.post('/api/auth/login').send({ login: 'admin', password: 'Yangi-12345' }).expect(200);
    const r = await u.post('/api/auth/logout').expect(200);
    expect(String(r.headers['set-cookie'])).toMatch(/hrms_token=;/);
    await u.get('/api/auth/me').expect(401);
  });

  it('soxta/buzilgan token 401', async () => {
    await http().get('/api/employees').set('Cookie', 'hrms_token=abc.def.ghi').expect(401);
  });
});
