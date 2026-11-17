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
  let opt: Record<string, Array<{ id: string; lat: string }>>;
  const pick = (kind: string, lat: string) => opt[kind].find((o) => o.lat === lat)!.id;
  const day = (offset: number) => new Date(Date.now() + offset * 864e5).toISOString().slice(0, 10);

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
    opt = (await op.get('/api/journal/meta').expect(200)).body.options;
  });
  afterAll(async () => { await app.close(); });

  it('rollar: operator yozadi, rahbar faqat o\'qiydi, kadrlar yozolmaydi, operator HR ma\'lumotini ko\'rmaydi', async () => {
    orgId = (await op.post('/api/journal/orgs').send({ name: 'Toshkent shahar hokimligi', region: 'Toshkent', groupId: pick('client_group', '№3') }).expect(201)).body.id;
    await boss.get('/api/journal/orgs').expect(200);
    await boss.post('/api/journal/orgs').send({ name: 'X' }).expect(403);
    await hr.post('/api/journal/orgs').send({ name: 'Y' }).expect(403);
    await hr.get('/api/journal/orgs').expect(200);
    await op.get('/api/employees').expect(403);
    await boss.get('/api/departments').expect(403);
    await op.patch('/api/journal/settings').send({ normDays: 3 }).expect(403);
    await a.patch('/api/journal/settings').send({ normDays: 3 }).expect(200);
  });

  it('ro\'yxatlar: boshlang\'ich elementlar, kirill nomi avtomatik, tur tekshiruvi', async () => {
    expect(opt.priority.map((o) => o.lat)).toEqual(['Past', 'O‘rta', 'Yuqori', 'Shoshilinch']);
    expect(opt.category.find((o) => o.lat === 'Hujjat holati')).toMatchObject({ cyr: 'Ҳужжат ҳолати' });
    // kanal o'rniga kategoriya yuborilsa rad etiladi
    await op.post('/api/journal/tickets').send({ received: day(-1), problem: 'x', channelId: pick('category', 'Boshqa') }).expect(400);
  });

  it('ro\'yxat elementi: nomini o\'zgartirish ma\'lumotni buzmaydi; ishlatilganni o\'chirib bo\'lmaydi; yashirish mumkin', async () => {
    const mine = (await a.post('/api/journal/options').send({ kind: 'category', labelLat: `Sinov ${Date.now()}` }).expect(201)).body;
    const t = (await op.post('/api/journal/tickets').send({ received: day(-3), problem: 'ERI', categoryId: mine.id }).expect(201)).body;
    await a.patch(`/api/journal/options/${mine.id}`).send({ labelLat: 'Sinov nomi', labelCyr: 'Синов номи' }).expect(200);
    expect((await op.get(`/api/journal/tickets/${t.id}`).expect(200)).body.category).toMatchObject({ lat: 'Sinov nomi', cyr: 'Синов номи' });
    await a.delete(`/api/journal/options/${mine.id}`).expect(409);                  // ishlatilgan
    await a.patch(`/api/journal/options/${mine.id}`).send({ active: false }).expect(200);
    await op.patch(`/api/journal/options/${mine.id}`).send({ active: false }).expect(403);   // faqat superadmin
    await op.delete(`/api/journal/tickets/${t.id}`).expect(200);
    await a.delete(`/api/journal/options/${mine.id}`).expect(204);                  // endi ishlatilmaydi
    await a.post('/api/journal/options').send({ kind: 'category', labelLat: 'Boshqa' }).expect(409);   // dublikat
    // tartib
    const order = opt.priority.map((o) => o.id).reverse();
    await a.put('/api/journal/options/order').send({ kind: 'priority', ids: order }).expect(204);
    const after = (await op.get('/api/journal/meta').expect(200)).body.options.priority.map((o: { id: string }) => o.id);
    expect(after).toEqual(order);
    await a.put('/api/journal/options/order').send({ kind: 'priority', ids: order.slice().reverse() }).expect(204);
  });

  it('tashkilot dublikati (apostrof/registr farqi) rad etiladi', async () => {
    await op.post('/api/journal/orgs').send({ name: '  TOSHKENT  shahar  hokimligi ' }).expect(409);
    await op.post('/api/journal/orgs').send({ name: 'Oʻzbekiston Respublikasi' }).expect(201);
    await op.post('/api/journal/orgs').send({ name: 'oʻzbekiston respublikasi' }).expect(409);
  });

  it('murojaat: avtomatik ID, holat tarixi, hal etilgan sana avtomatik', async () => {
    const year = new Date().getFullYear();
    const t1 = (await op.post('/api/journal/tickets').send({ received: `${year}-01-03`, orgId, problem: 'ERI ishlamayapti', priorityId: pick('priority', 'Yuqori') }).expect(201)).body;
    expect(t1.code).toBe(`M-${year}-0001`);
    expect(t1.status).toBe('registered');
    ticketId = t1.id;
    await op.post('/api/journal/tickets').send({ code: `M-${year}-0001`, received: `${year}-01-04`, problem: 'x' }).expect(409);
    // sana qabul sanasidan oldin bo'lmasin
    await op.post(`/api/journal/tickets/${ticketId}/status`).send({ status: 'resolved', date: `${year - 1}-12-31` }).expect(400);
    const done = (await op.post(`/api/journal/tickets/${ticketId}/status`).send({ status: 'resolved', date: `${year}-01-05` }).expect(200)).body;
    expect(done).toMatchObject({ status: 'resolved', resolvedAt: `${year}-01-05`, days: 2 });
    // qayta ochilsa hal etilgan sana olib tashlanadi
    const reopened = (await op.post(`/api/journal/tickets/${ticketId}/status`).send({ status: 'in_progress' }).expect(200)).body;
    expect(reopened).toMatchObject({ status: 'in_progress', resolvedAt: null, days: null });
    await op.post(`/api/journal/tickets/${ticketId}/status`).send({ status: 'bad' }).expect(400);
    const full = (await op.get(`/api/journal/tickets/${ticketId}`).expect(200)).body;
    expect(full.events.map((e: { status: string }) => e.status)).toEqual(['registered', 'resolved', 'in_progress']);
    // PATCH holatni o'zgartira olmaydi (faqat /status orqali)
    await op.patch(`/api/journal/tickets/${ticketId}`).send({ status: 'cancelled', problem: 'ERI ishlamayapti (yangilandi)' }).expect(200);
    expect((await op.get(`/api/journal/tickets/${ticketId}`).expect(200)).body.status).toBe('in_progress');
    // parallel yaratishda ID lar takrorlanmaydi
    const par = await Promise.all([1, 2, 3, 4].map((i) => op.post('/api/journal/tickets').send({ received: `${year}-01-06`, problem: 'par' + i })));
    expect(par.every((r) => r.status === 201)).toBe(true);
    expect(new Set(par.map((r) => r.body.code)).size).toBe(4);
  });

  it('murojaatlar ro\'yxati: holat tablari soni, "ochiq" filtri', async () => {
    const all = (await op.get('/api/journal/tickets').expect(200)).body;
    expect(all.counts).toMatchObject({ registered: 4, in_progress: 1, resolved: 0 });
    const prog = (await op.get('/api/journal/tickets?status=in_progress').expect(200)).body;
    expect(prog.total).toBe(1);
    expect(prog.counts.registered).toBe(4);              // tablar soni holat filtridan mustaqil
    expect((await op.get('/api/journal/tickets?open=true').expect(200)).body.total).toBe(5);
  });

  it('tartiblash: ruxsat etilgan ustunlar bo\'yicha, noma\'lum ustun e\'tiborsiz', async () => {
    const codes = (q: string) => op.get('/api/journal/tickets?pageSize=3&' + q).expect(200).then((r) => r.body.items.map((t: { code: string }) => t.code));
    const asc = await codes('sortBy=code&sortDir=asc'), desc = await codes('sortBy=code&sortDir=desc');
    expect(asc).toEqual([...asc].sort());
    expect(desc).toEqual([...desc].sort().reverse());
    await codes('sortBy=__proto__&sortDir=desc');                       // noma'lum kalit — xato bermaydi
    await op.get('/api/journal/kb?sortBy=status').expect(200);
    await op.get('/api/journal/trainings?sortBy=org&sortDir=desc').expect(200);
  });

  it('kundalik ish: davomiylik (yarim tundan o\'tganda), murojaatdan tashkilot, kun/vaqt jami', async () => {
    const e = (await op.post('/api/journal/entries').send({ date: day(0), start: '23:00', end: '01:30', typeId: pick('work_type', 'Texnik yordam'), ticketId, done: 'Sozlandi' }).expect(201)).body;
    expect(e.durationMin).toBe(150);
    expect(e.orgId).toBe(orgId);
    expect(e.type.lat).toBe('Texnik yordam');
    await op.post('/api/journal/entries').send({ date: day(0), start: '25:00', done: 'x' }).expect(400);
    await op.post('/api/journal/entries').send({ date: day(0) }).expect(400);           // "bajarilgan ish" majburiy
    const list = (await op.get('/api/journal/entries').expect(200)).body;
    expect(list).toMatchObject({ total: 1, minutes: 150 });
    const t = (await op.get(`/api/journal/tickets/${ticketId}`).expect(200)).body;
    expect(t.entries).toHaveLength(1);
    expect(t.minutes).toBe(150);
  });

  it('o\'qitish va bilimlar bazasi', async () => {
    await op.post('/api/journal/trainings').send({ date: day(0), orgId, topic: 'ERI bilan ishlash', count: 12, ticketId, formatId: pick('training_format', 'Onlayn') }).expect(201);
    await op.post('/api/journal/trainings').send({ date: day(0), topic: 'x', count: -1 }).expect(400);
    expect((await op.get('/api/journal/trainings').expect(200)).body.participants).toBe(12);
    const kb1 = (await op.post('/api/journal/kb').send({ created: day(0), question: 'ERI qanday ulanadi?', ticketId }).expect(201)).body;
    expect(kb1).toMatchObject({ code: 'BB-0001', status: 'draft' });
    await op.patch(`/api/journal/kb/${kb1.id}`).send({ status: 'active' }).expect(200);
    await op.patch(`/api/journal/kb/${kb1.id}`).send({ status: 'nope' }).expect(400);
  });

  it('hisobot: tarixdan hisoblanadi — keyingi o\'zgarishlar o\'tgan oyni buzmaydi', async () => {
    const year = new Date().getFullYear();
    // Murojaat yanvarda hal qilindi, keyin qayta ochildi (bugun) — yanvar hisobotida "hal qilingan" va oy oxirida yopiq bo'lib qoladi
    const jan = (await boss.get(`/api/journal/report?month=${year}-01`).expect(200)).body;
    expect(jan.kpi.received).toBe(5);
    expect(jan.kpi.resolved).toBe(1);
    expect(jan.kpi.avgDays).toBe(2);
    expect(jan.kpi.inNormPct).toBe(100);                    // me'yor 3 kun
    expect(jan.open).toHaveLength(4);                       // yanvar oxirida 5 tadan 4 tasi ochiq (hal qilingani yopiq)
    expect(jan.byGroup.find((g: { name: { lat: string } | null }) => g.name?.lat === '№3')).toMatchObject({ count: 1 });
    const mine = (await boss.get(`/api/journal/report?month=${year}-01&scope=me`).expect(200)).body;
    expect(mine.kpi.received).toBe(0);                      // rahbar o'zi yozuv kiritmagan
    await boss.get('/api/journal/report?month=2026-13').expect(400);
  });

  it('tashkilotni birlashtirish va o\'chirish tarixni saqlaydi', async () => {
    const other = (await op.post('/api/journal/orgs').send({ name: 'Dublikat tashkilot' }).expect(201)).body.id;
    await op.post('/api/journal/entries').send({ date: day(0), done: 'Maslahat berildi', orgId: other }).expect(201);
    await op.post(`/api/journal/orgs/${other}/merge`).send({ intoId: orgId }).expect(201);
    expect((await op.get(`/api/journal/orgs/${orgId}`).expect(200)).body.entries).toHaveLength(2);
    await op.delete(`/api/journal/orgs/${orgId}`).expect(200);
    expect((await op.get(`/api/journal/tickets/${ticketId}`).expect(200)).body.orgId).toBeNull();
    // murojaat o'chirilsa bog'langan ish qoladi, bog'lanish uziladi
    await op.delete(`/api/journal/tickets/${ticketId}`).expect(200);
    const list = (await op.get('/api/journal/entries').expect(200)).body;
    expect(list.total).toBe(2);
    expect(list.items.every((e: { ticketId: string | null }) => e.ticketId === null)).toBe(true);
  });
});
