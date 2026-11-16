import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../app.module';
import { configureApp } from '../app.setup';
import { prepareTestDb } from './test-db';

jest.setTimeout(90_000);

describe('Ijro jurnali (e2e)', () => {
  let app: INestApplication;
  const agent = () => request.agent(app.getHttpServer());
  let a: ReturnType<typeof agent>, op: ReturnType<typeof agent>, boss: ReturnType<typeof agent>, hr: ReturnType<typeof agent>;
  let orgId: string, ticketId: string;

  beforeAll(async () => {
    await prepareTestDb('hrms_test_journal');
    process.env.JWT_SECRET = 'test-secret-test-secret-123';
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    configureApp(app);
    await app.init();
    a = agent(); op = agent(); boss = agent(); hr = agent();
    await a.post('/api/auth/setup').send({ login: 'admin', password: 'Parol-12345', fullName: 'Админ' }).expect(201);
    await a.post('/api/users').send({ login: 'op', fullName: 'Оператор', role: 'operator', password: 'Oper-12345' }).expect(201);
    await a.post('/api/users').send({ login: 'boss', fullName: 'Раҳбар', role: 'rahbar', password: 'Boss-12345' }).expect(201);
    await a.post('/api/users').send({ login: 'hr', fullName: 'Кадр', role: 'kadrlar', password: 'Kadr-12345' }).expect(201);
    await op.post('/api/auth/login').send({ login: 'op', password: 'Oper-12345' }).expect(200);
    await boss.post('/api/auth/login').send({ login: 'boss', password: 'Boss-12345' }).expect(200);
    await hr.post('/api/auth/login').send({ login: 'hr', password: 'Kadr-12345' }).expect(200);
  });
  afterAll(async () => { await app.close(); });

  it('rollar: operator yozadi, rahbar faqat o\'qiydi, kadrlar yozolmaydi, operator HR ma\'lumotini ko\'rmaydi', async () => {
    orgId = (await op.post('/api/journal/orgs').send({ name: 'Toshkent shahar hokimligi', region: 'Toshkent' }).expect(201)).body.id;
    await boss.get('/api/journal/orgs').expect(200);
    await boss.post('/api/journal/orgs').send({ name: 'X' }).expect(403);
    await hr.post('/api/journal/orgs').send({ name: 'Y' }).expect(403);
    await hr.get('/api/journal/orgs').expect(200);
    await op.get('/api/employees').expect(403);
    await boss.get('/api/departments').expect(403);
    await op.patch('/api/journal/settings').send({ normDays: 3 }).expect(403);
    await a.patch('/api/journal/settings').send({ normDays: 3 }).expect(200);
  });

  it('tashkilot dublikati (apostrof/registr farqi) rad etiladi', async () => {
    await op.post('/api/journal/orgs').send({ name: '  TOSHKENT  shahar  hokimligi ' }).expect(409);
    await op.post('/api/journal/orgs').send({ name: 'Oʻzbekiston Respublikasi' }).expect(201);
    await op.post('/api/journal/orgs').send({ name: "oʻzbekiston respublikasi" }).expect(409);
  });

  it('murojaat: avtomatik ID, hal qilinganda sana, muddat', async () => {
    const t1 = (await op.post('/api/journal/tickets').send({ received: '2026-11-03', orgId, problem: 'ERI ishlamayapti', category: 'ERI / imzolash' }).expect(201)).body;
    expect(t1.code).toBe('M-2026-0001');
    const t2 = (await op.post('/api/journal/tickets').send({ received: '2026-11-04', orgId, problem: 'Kirish xatosi' }).expect(201)).body;
    expect(t2.code).toBe('M-2026-0002');
    ticketId = t1.id;
    // hal etilgan sana qabul sanasidan oldin bo'lmasin
    await op.patch(`/api/journal/tickets/${ticketId}`).send({ resolved: '2026-11-01' }).expect(400);
    const done = (await op.patch(`/api/journal/tickets/${ticketId}`).send({ status: 'Hal qilindi', resolved: '2026-11-05' }).expect(200)).body;
    expect(done.days).toBe(2);
    // takroriy ID
    await op.post('/api/journal/tickets').send({ code: 'M-2026-0001', received: '2026-11-04', problem: 'x' }).expect(409);
    // parallel yaratishda ID lar takrorlanmaydi
    const par = await Promise.all([1, 2, 3, 4].map((i) => op.post('/api/journal/tickets').send({ received: '2026-11-06', problem: 'par' + i })));
    expect(new Set(par.map((r) => r.body.code)).size).toBe(4);
    expect(par.every((r) => r.status === 201)).toBe(true);
  });

  it('kundalik ish: davomiylik (yarim tundan o\'tganda ham), murojaatdan tashkilot olinadi', async () => {
    const e = (await op.post('/api/journal/entries').send({ date: '2026-11-05', start: '23:00', end: '01:30', type: 'Texnik yordam', ticketId, done: 'Sozlandi' }).expect(201)).body;
    expect(e.durationMin).toBe(150);
    expect(e.orgId).toBe(orgId);
    await op.post('/api/journal/entries').send({ date: '2026-11-05', start: '25:00', type: 'Maslahat' }).expect(400);
    const t = (await op.get(`/api/journal/tickets/${ticketId}`).expect(200)).body;
    expect(t.entries).toHaveLength(1);
    expect(t.minutes).toBe(150);
  });

  it('o\'qitish va bilimlar bazasi', async () => {
    await op.post('/api/journal/trainings').send({ date: '2026-11-07', orgId, topic: 'ERI bilan ishlash', count: 12, ticketId }).expect(201);
    await op.post('/api/journal/trainings').send({ date: '2026-11-07', topic: 'x', count: -1 }).expect(400);
    const kb1 = (await op.post('/api/journal/kb').send({ created: '2026-11-08', question: 'ERI qanday ulanadi?', ticketId }).expect(201)).body;
    expect(kb1.code).toBe('BB-0001');
    expect(kb1.status).toBe('Loyiha');
  });

  it('oylik hisobot: bo\'lim va xodim kesimida', async () => {
    const r = (await boss.get('/api/journal/report?month=2026-11').expect(200)).body;
    expect(r.kpi.received).toBe(6);
    expect(r.kpi.resolved).toBe(1);
    expect(r.kpi.avgDays).toBe(2);
    expect(r.kpi.inNormPct).toBe(100);          // me'yor 3 kun
    expect(r.kpi.entries).toBe(1);
    expect(r.kpi.minutes).toBe(150);
    expect(r.kpi.trainedUsers).toBe(12);
    expect(r.kpi.kbFromTicket).toBe(1);
    expect(r.open).toHaveLength(5);             // 6 ta qabul, 1 tasi hal qilingan
    const mine = (await boss.get('/api/journal/report?month=2026-11&scope=me').expect(200)).body;
    expect(mine.kpi.received).toBe(0);          // rahbar o'zi yozuv kiritmagan
    // ro'yxatdagi muhim holatni o'chirib bo'lmaydi
    await a.patch('/api/journal/settings').send({ lists: { statuses: ['Yangi', 'Jarayonda'] } }).expect(400);
    await boss.get('/api/journal/report?month=2026-13').expect(400);
  });

  it('tashkilotni birlashtirish va o\'chirish tarixni saqlaydi', async () => {
    const other = (await op.post('/api/journal/orgs').send({ name: 'Dublikat tashkilot' }).expect(201)).body.id;
    await op.post('/api/journal/entries').send({ date: '2026-11-09', type: 'Maslahat', orgId: other }).expect(201);
    await op.post(`/api/journal/orgs/${other}/merge`).send({ intoId: orgId }).expect(201);
    expect((await op.get(`/api/journal/orgs/${orgId}`).expect(200)).body.entries).toHaveLength(2);
    // tashkilot o'chirilsa yozuvlar qoladi
    await op.delete(`/api/journal/orgs/${orgId}`).expect(200);
    const t = (await op.get(`/api/journal/tickets/${ticketId}`).expect(200)).body;
    expect(t.orgId).toBeNull();
    // murojaat o'chirilsa bog'langan ish qoladi, bog'lanish uziladi
    await op.delete(`/api/journal/tickets/${ticketId}`).expect(200);
    const list = (await op.get('/api/journal/entries?month=2026-11').expect(200)).body;
    expect(list.total).toBe(2);
    expect(list.items.every((e: { ticketId: string | null }) => e.ticketId === null)).toBe(true);
  });
});
