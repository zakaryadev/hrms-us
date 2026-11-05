import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { mkdtempSync, readFileSync } from 'fs';
import { deflateSync, crc32 } from 'zlib';
import { tmpdir } from 'os';
import { join } from 'path';
import PizZip from 'pizzip';
import request from 'supertest';

jest.setTimeout(120_000);

describe('Yangi buyruqlar, tahrirlash, raqamlash, shablon yuklash, eksport, foydalanuvchi o\'chirish (e2e)', () => {
  let app: INestApplication;
  let a: ReturnType<typeof request.agent>, acc: ReturnType<typeof request.agent>;
  let deptId: string, posId: string, empId: string, dir: string, genDir: string, bundled: string;
  const text = (buf: Buffer) => new PizZip(buf).file('word/document.xml')!.asText().replace(/<[^>]+>/g, '');
  const fileOf = async (id: string) => {
    const r = await a.get(`/api/documents/generated/${id}/download`).buffer(true).parse((res, cb) => { const c: Buffer[] = []; res.on('data', (d: Buffer) => c.push(d)); res.on('end', () => cb(null, Buffer.concat(c))); }).expect(200);
    return r.body as Buffer;
  };
  const gen = (type: string, params: any, id = empId) => a.post(`/api/documents/generate/${type}`).send({ employeeId: id, params: { lang: 'lat', ...params } });

  beforeAll(async () => {
    dir = mkdtempSync(join(tmpdir(), 'hrms-tpl-')); genDir = mkdtempSync(join(tmpdir(), 'hrms-gen-'));
    process.env.CUSTOM_TEMPLATE_DIR = dir; process.env.GENERATED_DIR = genDir; process.env.UPLOAD_DIR = mkdtempSync(join(tmpdir(), 'hrms-up-'));
    const { prepareTestDb } = await import('./test-db');
    await prepareTestDb('hrms_test_orders2');
    process.env.JWT_SECRET = 'test-secret-test-secret-123';
    const { AppModule } = await import('../app.module');
    const { configureApp } = await import('../app.setup');
    const { TEMPLATE_DIR } = await import('../docx/docx.service');
    bundled = TEMPLATE_DIR;
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    configureApp(app);
    await app.init();
    a = request.agent(app.getHttpServer()); acc = request.agent(app.getHttpServer());
    await a.post('/api/auth/setup').send({ login: 'admin', password: 'Parol-12345', fullName: 'Админ' }).expect(201);
    await a.post('/api/users').send({ login: 'acc', fullName: 'Бухг', role: 'buxgalter', password: 'Buxg-12345' }).expect(201);
    await acc.post('/api/auth/login').send({ login: 'acc', password: 'Buxg-12345' }).expect(200);
    const dept = (await a.post('/api/departments').send({ name: 'Бўлим' }).expect(201)).body;
    const pos = (await a.post('/api/positions').send({ title: 'Мутахассис', departmentId: dept.id }).expect(201)).body;
    deptId = dept.id; posId = pos.id;
    empId = (await a.post('/api/employees').send({ tabNumber: '1', firstName: 'Али', lastName: 'Валиев', departmentId: dept.id, positionId: pos.id, salary: 6500000, hireDate: '2026-05-01', probationMonths: 3 }).expect(201)).body.id;
  });
  afterAll(async () => { await app.close(); });

  it('ishga qabul buyrug\'i: raqamlash o\'chirishdan keyin ham takrorlanmaydi, qo\'lda kiritilgan dublikat 409', async () => {
    const r1 = await gen('buyruq-qabul', { orderDate: '2026-05-01' }).expect(201);
    expect(r1.body.number).toBe('Q-1');
    const t = text(await fileOf(r1.body.id));
    expect(t).toContain('Валиев'); expect(t).toContain('6 500 000'); expect(t).toMatch(/3 oy sinov/);
    const r2 = await gen('buyruq-qabul', { orderDate: '2026-05-02' }).expect(201);
    expect(r2.body.number).toBe('Q-2');
    await a.delete(`/api/documents/generated/${r1.body.id}`).expect(204);
    expect((await gen('buyruq-qabul', { orderDate: '2026-05-03' }).expect(201)).body.number).toBe('Q-3');
    await gen('buyruq-qabul', { orderDate: '2026-05-03', orderNumber: 'Q-2' }).expect(409);
    await gen('buyruq-qabul', { orderDate: '2027-01-10', orderNumber: 'Q-2' }).expect(201);   // boshqa yil — mumkin
    // bir vaqtda yaratilganda ham raqamlar noyob
    const many = await Promise.all([1, 2, 3, 4].map(() => gen('buyruq-rag', { orderDate: '2026-06-01', reason: 'намунали меҳнат', basis: 'Асос', rewardText: 'Миннатдорчилик' })));
    many.forEach((m) => expect(m.status).toBe(201));
    expect(new Set(many.map((m) => m.body.number)).size).toBe(4);
  });

  it('rag\'batlantirish: tur yoki summa shart; ikkalasi matnga chiqadi', async () => {
    await gen('buyruq-rag', { orderDate: '2026-06-01', reason: 'x', basis: 'y' }).expect(400);
    const r = await gen('buyruq-rag', { orderDate: '2026-06-02', reason: 'намунали меҳнат', basis: 'Асос', rewardText: 'Миннатдорчилик эълон қилинсин', amount: 1500000 }).expect(201);
    const t = text(await fileOf(r.body.id));
    expect(t).toContain('Миннатдорчилик эълон қилинсин'); expect(t).toContain('1 500 000'); expect(t).toContain('намунали меҳнат');
    expect((await a.get('/api/orders?type=ragbatlantirish').expect(200)).body.length).toBeGreaterThan(0);
  });

  it('hujjatni tahrirlash: fayl va buyruq yozuvi yangilanadi, raqam saqlanadi', async () => {
    const r = await gen('buyruq-rag', { orderDate: '2026-06-03', reason: 'биринчи сабаб', basis: 'Асос', amount: 100000 }).expect(201);
    const before = (await a.get('/api/orders').expect(200)).body.find((o: any) => o.orderNumber === r.body.number);
    await a.put(`/api/documents/generated/${r.body.id}`).send({ params: { reason: 'иккинчи сабаб', amount: 250000, orderDate: '2026-06-04' } }).expect(200);
    const t = text(await fileOf(r.body.id));
    expect(t).toContain('иккинчи сабаб'); expect(t).toContain('250 000'); expect(t).not.toContain('биринчи сабаб');
    const orders = (await a.get('/api/orders').expect(200)).body;
    const after = orders.find((o: any) => o.id === before.id);
    expect(after.orderNumber).toBe(r.body.number); expect(after.orderDate.slice(0, 10)).toBe('2026-06-04');
    expect(orders.filter((o: any) => o.orderNumber === r.body.number).length).toBe(1);   // yangi yozuv qo'shilmadi
    await acc.put(`/api/documents/generated/${r.body.id}`).send({ params: {} }).expect(403);
  });

  it('ta\'til buyrug\'i: o\'chirilganda yoki ko\'chirilganda tabeldagi MT qaytadi', async () => {
    await a.post('/api/timesheet/autofill').send({ year: 2026, month: 11 }).expect(201);
    const mt = async () => {
      const t = (await a.get('/api/timesheet?year=2026&month=11').expect(200)).body.rows.find((r: any) => r.employeeId === empId);
      return Object.entries(t.daysData as Record<string, string>).filter(([, v]) => v === 'MT').map(([k]) => Number(k));
    };
    const r = await gen('buyruq-tatil', { orderDate: '2026-11-04', startDate: '2026-11-16', basicDays: 5, extraDays: 0 }).expect(201);
    expect(await mt()).toEqual([16, 17, 18, 19, 20]);
    await a.put(`/api/documents/generated/${r.body.id}`).send({ params: { startDate: '2026-11-23' } }).expect(200);
    expect(await mt()).toEqual([23, 24, 25, 26, 27]);
    await a.delete(`/api/documents/generated/${r.body.id}`).expect(204);
    expect(await mt()).toEqual([]);
  });

  it('ishdan bo\'shatish buyrug\'i xodimni arxivga o\'tkazadi; save:false — o\'tkazmaydi; ikkinchi marta rad', async () => {
    const e2 = (await a.post('/api/employees').send({ tabNumber: '2', firstName: 'Вали', lastName: 'Каримов', departmentId: deptId, positionId: posId, salary: 5000000, hireDate: '2026-01-01' }).expect(201)).body.id;
    const params = { orderDate: '2026-11-05', dismissalDate: '2026-11-10', basis: 'Ходимнинг аризаси', compensation: true };
    await gen('buyruq-bosh', { ...params, save: false }, e2).expect(201);
    expect((await a.get(`/api/employees/${e2}`).expect(200)).body.status).not.toBe('ishdan_boshagan');
    const r = await gen('buyruq-bosh', params, e2).expect(201);
    expect(r.body.number).toMatch(/^B-/);
    expect(text(await fileOf(r.body.id))).toMatch(/kompensatsiya/);
    expect((await a.get(`/api/employees/${e2}`).expect(200)).body.status).toBe('ishdan_boshagan');
    await gen('buyruq-bosh', params, e2).expect(400);
  });

  it("shablonlar: ro'yxat 8 ta, bitta shablon yuklanadi (yozuv avtomatik aniqlanadi), qolgan yozuvlar avtomatik o'giriladi, standartga qaytadi", async () => {
    const T = '/api/documents/templates';
    const list = (await a.get(T).expect(200)).body;
    expect(list.length).toBe(8);
    expect(list.every((t: any) => t.custom === false && t.scripts.cyr === 'bundled' && t.scripts.lat === 'bundled' && t.scripts['lat-new'] === 'auto')).toBe(true);

    const put = (name: string, buf: Buffer | string, fname = 'x.docx', ag = a, qs = '') => ag.put(`${T}/${name}${qs}`).attach('file', Buffer.from(buf as any), fname);
    await put('buyruq-rag', 'oddiy matn').expect(400);                                    // docx emas
    const src = readFileSync(join(bundled, 'cyr', 'buyruq-rag.docx'));
    await put('buyruq-rag', src, 'x.txt').expect(400);                                    // kengaytma
    await put('nomalum', src).expect(404);
    await put('buyruq-rag', src, 'x.docx', acc).expect(403);
    const broken = new PizZip(src); broken.file('word/document.xml', broken.file('word/document.xml')!.asText().replace('{{sabab_matni}}', '{{#ochiq}}'));
    await put('buyruq-rag', broken.generate({ type: 'nodebuffer' })).expect(400);          // yopilmagan blok

    // KIRILL shablon yuklaymiz (statik matn kirillda)
    const zip = new PizZip(src);
    zip.file('word/document.xml', zip.file('word/document.xml')!.asText().replace('{{buyruq_raqami}}', 'ШАХСУС-{{buyruq_raqami}}{{notanish}}'));
    const ok = await put('buyruq-rag', zip.generate({ type: 'nodebuffer' })).expect(200);
    expect(ok.body.unknownFields).toEqual(['notanish']);
    expect(ok.body.script).toBe('cyr');                                                    // yozuv avtomatik aniqlandi
    const row = (await a.get(T).expect(200)).body.find((t: any) => t.name === 'buyruq-rag');
    expect(row).toMatchObject({ custom: true, masterScript: 'cyr', scripts: { cyr: 'custom', lat: 'auto', 'lat-new': 'auto' } });
    // муҳаррир палитраси: стандарт шаблондаги оддий майдонлар ва алоҳида блоклар (ўчирилган майдон ҳам қайта қўшилиши учун)
    expect(row.available).toEqual(expect.arrayContaining(['buyruq_raqami', 'sabab_matni', 'xodim_fish']));
    expect(row.blocks).toEqual(expect.arrayContaining(['mukofot_matni', 'summa_matni']));
    expect(row.available).not.toEqual(expect.arrayContaining(['mukofot_matni']));

    // shu bitta shablondan har uch yozuvda hujjat: butun matn avtomatik o'giriladi
    const gen3 = async (lang: string) => text(await fileOf((await a.post('/api/documents/generate/buyruq-rag').send({ employeeId: empId, params: { lang, orderDate: '2026-07-01', reason: 'намунали меҳнат', basis: 'Асос', rewardText: 'Миннатдорчилик' } }).expect(201)).body.id));
    const cyr = await gen3('cyr'), lat = await gen3('lat'), neu = await gen3('lat-new');
    expect(cyr).toContain('ШАХСУС-'); expect(cyr).toContain('намунали меҳнат');
    expect(lat).toContain('SHAXSUS-'); expect(lat).toContain('namunali mehnat'); expect(lat).not.toMatch(/[А-Яа-я]/);
    expect(neu).toContain('ŞAXSUS-'); expect(neu).toContain('namunali meçnat'.replace('meçnat', 'mehnat')); expect(neu).not.toMatch(/[А-Яа-я]/);

    // yuklab olish: istalgan yozuvda
    const get = (qs: string) => a.get(`${T}/buyruq-rag/download${qs}`).buffer(true).parse((res, cb) => { const c: Buffer[] = []; res.on('data', (d: Buffer) => c.push(d)); res.on('end', () => cb(null, Buffer.concat(c))); }).expect(200);
    expect(text((await get('?script=cyr')).body)).toContain('ШАХСУС-');
    const dlLat = text((await get('?script=lat')).body);
    expect(dlLat).toContain('SHAXSUS-'); expect(dlLat).toContain('{{sabab_matni}}');          // {{майдон}} белгилари ўзгармайди
    await a.get(`${T}/buyruq-rag/download?script=greek`).expect(404);

    await acc.delete(`${T}/buyruq-rag`).expect(403);
    await a.delete(`${T}/buyruq-rag`).expect(204);
    await a.delete(`${T}/buyruq-rag`).expect(404);
    expect(await gen3('lat')).not.toContain('SHAXSUS');                                    // standart shablon

    // oldingi yuklangan versiyani tiklash
    expect((await a.get(T).expect(200)).body.find((t: any) => t.name === 'buyruq-rag').hasPrevious).toBe(true);
    await acc.post(`${T}/buyruq-rag/restore`).expect(403);
    await a.post(`${T}/buyruq-rag/restore`).expect(204);
    expect(await gen3('lat')).toContain('SHAXSUS-');
    // LOTIN shablon yuklansa — yozuv 'lat' deb aniqlanadi va kirill hujjat avtomatik hosil bo'ladi; yangisi oldingisini almashtiradi
    const latSrc = new PizZip(readFileSync(join(bundled, 'lat', 'buyruq-rag.docx')));
    latSrc.file('word/document.xml', latSrc.file('word/document.xml')!.asText().replace('{{buyruq_raqami}}', 'MAXSUS-{{buyruq_raqami}}'));
    const okLat = await put('buyruq-rag', latSrc.generate({ type: 'nodebuffer' })).expect(200);
    expect(okLat.body.script).toBe('lat');
    expect((await a.get(T).expect(200)).body.find((t: any) => t.name === 'buyruq-rag')).toMatchObject({ masterScript: 'lat', scripts: { cyr: 'auto', lat: 'custom', 'lat-new': 'auto' } });
    expect(await gen3('cyr')).toContain('МАХСУС-');
    await a.delete(`${T}/buyruq-rag`).expect(204);   // keyingi testlarga ta'sir qilmasin
    await a.post(`${T}/nomalum/restore`).expect(404);
  });

  it("standart shablon yangi alifboda: butun hujjat avtomatik o'giriladi (Ş Ç Ö Ğ)", async () => {
    const g = await a.post('/api/documents/generate/obyektivka').send({ employeeId: empId, params: { lang: 'lat-new' } }).expect(201);
    const t = text(await fileOf(g.body.id));
    expect(t).toContain('Tuğilgan yili');                      // Tug'ilgan → Tuğilgan
    expect(t).toContain('MAʼLUMOTNOMA');
    expect(t).not.toMatch(/[А-Яа-я]/);
    expect(t).not.toMatch(/\bsh|\bch|oʻ|gʻ/i);
  });

  it("DOCX konvertor: butun Word fayl matni kirill/lotin/yangi alifboga (format va {{maydon}} saqlanadi)", async () => {
    const src = readFileSync(join(bundled, 'cyr', 'obyektivka.docx'));
    const conv = async (to: string, file: Buffer = src, name = 'shablon.docx', ag: any = a) => ag.post('/api/translit/docx').field('to', to).attach('file', file, name)
      .buffer(true).parse((res: any, cb: any) => { const c: Buffer[] = []; res.on('data', (d: Buffer) => c.push(d)); res.on('end', () => cb(null, Buffer.concat(c))); });
    await request(app.getHttpServer()).post('/api/translit/docx').field('to', 'lat').attach('file', src, 'x.docx').expect(401);
    await conv('greek').then((r: any) => expect(r.status).toBe(400));
    await conv('lat', Buffer.from('oddiy matn'), 'x.docx').then((r: any) => expect(r.status).toBe(400));
    await conv('lat', src, 'x.pdf').then((r: any) => expect(r.status).toBe(400));
    const r = await conv('lat');
    expect(r.status).toBe(201);
    expect(r.headers['content-disposition']).toContain('shablon-lat.docx');
    const before = new PizZip(src), after = new PizZip(r.body);
    const xml = (z: PizZip) => z.file('word/document.xml')!.asText();
    const t = text(r.body);
    expect(t).toContain('MAʼLUMOTNOMA'); expect(t).toContain('{{xodim_fish}}'); expect(t).not.toMatch(/[А-Яа-я]/);
    // форматлаш: бўлаклар (run), қалин ва жадвал сони ўзгармайди; расм сақланади
    for (const tag of ['<w:r>', '<w:r ', '<w:b/>', '<w:tbl>', '<w:tr ', '<w:tc>']) expect(xml(after).split(tag).length).toBe(xml(before).split(tag).length);
    expect(Object.keys(after.files).sort()).toEqual(Object.keys(before.files).sort());
    // янги алифбо ва ортга: лотин → кирилл қайта ўгирилганда {{майдон}} ва матн сақланади
    expect(text((await conv('lat-new')).body)).toContain('Tuğilgan');
    const back = text((await conv('cyr', r.body, 'orqaga.docx')).body);
    expect(back).toContain('{{xodim_fish}}'); expect(back).toContain('МАЪЛУМОТНОМА');
  });

  it('bazada buyruq raqami yil ichida noyob (unique indeks), eski jurnal yozuvlari tozalanadi', async () => {
    const { PrismaService } = await import('../prisma/prisma.service');
    const { AuditService } = await import('../audit/audit.service');
    const prisma = app.get(PrismaService);
    const idx = await prisma.$queryRaw<{ n: number }[]>`SELECT 1 AS n FROM pg_indexes WHERE indexname = 'orders_number_year_key'`;
    expect(idx.length).toBe(1);
    await expect(prisma.order.create({ data: { orderNumber: 'Q-2', orderDate: new Date('2026-12-01'), orderType: 'ishga_qabul', employeeId: empId } })).rejects.toThrow();
    await prisma.order.create({ data: { orderNumber: 'Q-2', orderDate: new Date('2030-12-01'), orderType: 'ishga_qabul', employeeId: empId } });   // boshqa yil — mumkin

    await prisma.auditLog.create({ data: { createdAt: new Date('2020-01-01'), action: 'delete', entity: 'x', method: 'DELETE', path: '/x', status: 200 } });
    process.env.AUDIT_RETENTION_DAYS = '365';
    expect(await app.get(AuditService).purgeOld()).toBeGreaterThanOrEqual(1);
    expect(await prisma.auditLog.count({ where: { entity: 'x' } })).toBe(0);
    expect(await prisma.auditLog.count()).toBeGreaterThan(0);
  });

  it('eksport: xodimlar va buyruqlar Excel fayl sifatida (bugalter ham ko\'ra oladi)', async () => {
    const bin = (ag: typeof a, url: string) => ag.get(url).buffer(true).parse((res, cb) => { const c: Buffer[] = []; res.on('data', (d: Buffer) => c.push(d)); res.on('end', () => cb(null, Buffer.concat(c))); });
    for (const [ag, url] of [[a, '/api/employees/export'], [acc, '/api/employees/export?archived=false'], [a, '/api/orders/export'], [acc, '/api/orders/export?type=ragbatlantirish']] as const) {
      const r = await bin(ag as any, url).expect(200);
      expect(r.headers['content-type']).toMatch(/spreadsheetml/);
      expect((r.body as Buffer).subarray(0, 2).toString()).toBe('PK');
    }
    const wb = new (require('exceljs').Workbook)();
    await wb.xlsx.load((await bin(a, '/api/employees/export')).body as Buffer);
    const ws = wb.getWorksheet('Ходимлар');
    expect(ws.rowCount).toBeGreaterThanOrEqual(3);
    expect(ws.getRow(1).getCell(2).value).toBe('Ф.И.Ш.');
  });

  it('foydalanuvchini o\'chirish: o\'zini va oxirgi adminni emas; jurnalga yoziladi', async () => {
    const me = (await a.get('/api/auth/me')).body;
    await a.delete(`/api/users/${me.id}`).expect(400);
    const u = (await a.post('/api/users').send({ login: 'tmp', fullName: 'Вақтинча', role: 'kadrlar', password: 'Kadr-12345' }).expect(201)).body;
    await acc.delete(`/api/users/${u.id}`).expect(403);
    await a.delete(`/api/users/${u.id}`).expect(204);
    await a.delete(`/api/users/${u.id}`).expect(404);
    expect((await a.get('/api/users')).body.some((x: any) => x.id === u.id)).toBe(false);
    const j = (await a.get('/api/audit?entity=users').expect(200)).body.items;
    expect(j.some((x: any) => x.action === 'delete' && /Вақтинча/.test(x.summary))).toBe(true);
  });

  it('Т-2 маълумотнома: ходим маълумоти, 2 қаторли туғилган жой, ишга қабул сатри, қариндошлар ва фото (e2e)', async () => {
    const png = (w: number, h: number) => {
      const chunk = (t: string, d: Buffer) => { const b = Buffer.concat([Buffer.from(t), d]); const len = Buffer.alloc(4); len.writeUInt32BE(d.length); const c = Buffer.alloc(4); c.writeUInt32BE(crc32(b) >>> 0); return Buffer.concat([len, b, c]); };
      const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
      const raw = Buffer.alloc((w * 3 + 1) * h, 120);
      for (let y = 0; y < h; y++) raw[y * (w * 3 + 1)] = 0;
      return Buffer.concat([Buffer.from('89504e470d0a1a0a', 'hex'), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
    };
    const e = (await a.post('/api/employees').send({
      tabNumber: '77', firstName: 'Закарья', lastName: 'Муратбаев', middleName: 'Бахтияр улы', departmentId: deptId, positionId: posId, salary: 5000000,
      hireDate: '2026-07-01', birthDate: '2003-10-13', educationLevel: 'олий', foreignLanguages: 'Рус тили', academicDegree: 'фан номзоди', stateAwards: '“Дўстлик” ордени', birthPlace: 'Қорақалпоғистон Республикаси, Нукус шаҳри', nationality: 'қорақалпоқ',
      education: [{ institutionName: 'Нукус давлат техника университети', speciality: 'Дастурий инжиниринг', studyType: 'кундузги', endYear: 2025 }],
      workHistory: [{ organizationName: 'Data Life', positionTitle: 'график дизайнери', startDate: '2021-01-01', endDate: '2023-12-31' }],
      relatives: [{ relativeType: 'Отаси', fullName: 'Бердибаев Бахтияр', birthYearPlace: '1974 йил, Нукус', workPlacePosition: 'Тадбиркор', livingAddress: 'Нукус, Жасарат 92' }],
    }).expect(201)).body;
    const gen = (lang: string) => a.post('/api/documents/generate/obyektivka').send({ employeeId: e.id, params: { lang } });
    // фотосиз: шаблондаги рамка қолади
    const g0 = await gen('cyr').expect(201);
    const z0 = new PizZip(await fileOf(g0.body.id));
    expect(z0.file('word/media/photo.png')).toBeNull();
    // расм юклангандан кейин — ходим расми қўйилади
    await a.post(`/api/employees/${e.id}/photo`).attach('file', png(30, 40), 'p.png').expect(201);
    const g1 = await gen('cyr').expect(201);
    const buf = await fileOf(g1.body.id); const z = new PizZip(buf);
    const t = text(buf);
    expect(z.file('word/media/photo.png')).toBeTruthy();
    for (const x of ['Муратбаев Закарья Бахтияр улы'.replace('Муратбаев Закарья', 'Муратбаев Закарья'), '2026 йил 01 июлдан', '13.10.2003', 'Қорақалпоғистон Республикаси,', 'Нукус шаҳри', 'қорақалпоқ',
      '2025 й. Нукус давлат техника университети (кундузги)', 'Дастурий инжиниринг', 'Рус тили', 'фан номзоди', '“Дўстлик” ордени', 'олий', '2021-2023 йй.', 'Data Life - график дизайнери', '2026 й. - ҳ.в.', 'Бердибаев Бахтияр', 'Жасарат 92'])
      expect(t).toContain(x);
    expect(t).not.toMatch(/\{\{|\}\}/);
    // профилдаги қиймат тозаланса — «йўқ»; профилда бўлмаган майдонлар доим «йўқ»
    await a.patch(`/api/employees/${e.id}`).send({ foreignLanguages: '', stateAwards: '' }).expect(200);
    const t2 = text(await fileOf((await gen('cyr').expect(201)).body.id));
    expect(t2).not.toContain('Рус тили'); expect(t2).not.toContain('Дўстлик'); expect(t2).toContain('фан номзоди');
    expect(t2).toMatch(/Қайси чет тилларини билади:[\s\S]*йўқ/);
    const gl = await gen('lat').expect(201);
    expect(text(await fileOf(gl.body.id))).toContain("MA'LUMOTNOMA");
  });

  it("ходимлар рўйхати: устун бўйича тартиблаш (сервер), нотўғри калит рад этилмайди, ҳисобот шу тартибда", async () => {
    const tabs = async (qs: string) => (await a.get(`/api/employees?pageSize=50&${qs}`).expect(200)).body.items.map((x: any) => x.tabNumber);
    const asc = await tabs('sortBy=tabNumber&sortDir=asc'), desc = await tabs('sortBy=tabNumber&sortDir=desc');
    expect(asc.length).toBeGreaterThanOrEqual(2);
    expect(desc).toEqual([...asc].reverse());
    const fio = (await a.get('/api/employees?pageSize=50&sortBy=fio&sortDir=asc').expect(200)).body.items.map((x: any) => x.lastName);
    expect(fio).toEqual([...fio].sort((x: string, y: string) => x.localeCompare(y, 'ru')));
    await a.get('/api/employees?sortBy=passwordHash&sortDir=asc').expect(200);          // рухсат этилмаган калит — стандарт тартиб
    await a.get('/api/employees?sortBy=tabNumber&sortDir=sideways').expect(400);         // нотўғри йўналиш — валидация
  });

  it("DOCX файл номи: «12_Muratbayev_Zakarya_Baxtiyar_uli_“Ijro_gov_uz”_menejer.docx» шакли (сақланган ва сақланмаган юклаш)", async () => {
    const dept = (await a.post('/api/departments').send({ name: '“Ijro.gov.uz” тизимини жорий этиш сектори' }).expect(201)).body;
    const pos = (await a.post('/api/positions').send({ title: 'мижозлар билан ишлаш бўйича менежер', departmentId: dept.id }).expect(201)).body;
    const emp = (await a.post('/api/employees').send({ tabNumber: '12', firstName: 'Закарья', lastName: 'Муратбаев', middleName: 'Бахтияр улы', departmentId: dept.id, positionId: pos.id, salary: 1, hireDate: '2026-07-01' }).expect(201)).body;
    const fname = (cd: string) => decodeURIComponent(/filename\*=UTF-8''([^;]+)/i.exec(cd)![1]);
    const want = '12_Muratbayev_Zakarya_Baxtiyar_uli_“Ijro_gov_uz”_menejer.docx';
    // сақланмайдиган (дарҳол юклаш)
    const pre = await a.post('/api/documents/generate/obyektivka').send({ employeeId: emp.id, params: { save: false } }).buffer(true).parse((res, cb) => { const c: Buffer[] = []; res.on('data', (d: Buffer) => c.push(d)); res.on('end', () => cb(null, Buffer.concat(c))); }).expect(201);
    expect(fname(pre.headers['content-disposition'])).toBe(want);
    // сақланган → «Юклаб олиш»
    const g = await a.post('/api/documents/generate/obyektivka').send({ employeeId: emp.id, params: {} }).expect(201);
    const dl = await a.get(`/api/documents/generated/${g.body.id}/download`).buffer(true).parse((res, cb) => { const c: Buffer[] = []; res.on('data', (d: Buffer) => c.push(d)); res.on('end', () => cb(null, Buffer.concat(c))); }).expect(200);
    expect(fname(dl.headers['content-disposition'])).toBe(want);
    // буйруқ: тури ва рақами қўшилади (ҳужжат ва «Буйруқлар» рўйхатидан юклаш бир хил)
    const o = await a.post('/api/documents/generate/buyruq-rag').send({ employeeId: emp.id, params: { lang: 'cyr', orderDate: '2026-08-01', reason: 'x', basis: 'y', rewardText: 'z' } }).expect(201);
    const od = await a.get(`/api/documents/generated/${o.body.id}/download`).buffer(true).parse((res, cb) => { const c: Buffer[] = []; res.on('data', (d: Buffer) => c.push(d)); res.on('end', () => cb(null, Buffer.concat(c))); }).expect(200);
    const rn = String(o.body.number).replace('Р', 'R');      // кирилл «Р-» префикси файл номида лотинда
    expect(fname(od.headers['content-disposition'])).toBe(`12_Muratbayev_Zakarya_Baxtiyar_uli_“Ijro_gov_uz”_menejer_buyruq-rag-${rn}.docx`);
    const ord = (await a.get('/api/orders?type=ragbatlantirish').expect(200)).body.find((x: any) => x.orderNumber === o.body.number && x.employee.id === emp.id);
    const oo = await a.get(`/api/orders/${ord.id}/download`).buffer(true).parse((res, cb) => { const c: Buffer[] = []; res.on('data', (d: Buffer) => c.push(d)); res.on('end', () => cb(null, Buffer.concat(c))); }).expect(200);
    expect(fname(oo.headers['content-disposition'])).toBe(`12_Muratbayev_Zakarya_Baxtiyar_uli_“Ijro_gov_uz”_menejer_buyruq-rag-${rn}.docx`);
  });

  it('транслитератор API: кирилл/лотин/янги алифбо, кириш талаб қилинади, журналга ёзилмайди', async () => {
    await request(app.getHttpServer()).post('/api/translit').send({ text: 'x', to: 'lat' }).expect(401);
    const run = async (text: string, to: string, extra: any = {}) => (await a.post('/api/translit').send({ text, to, ...extra }).expect(201)).body;
    expect((await run('Ўзбекистон Шаҳар', 'lat-new')).result).toBe('Özbekiston Şahar');
    expect(await run('Toshkent shahri', 'cyr')).toEqual({ result: 'Тошкент шаҳри', source: 'lat' });
    expect((await run('Муратбаев', 'lat', { apostrophe: 'ascii' })).source).toBe('cyr');
    await a.post('/api/translit').send({ text: 'x', to: 'greek' }).expect(400);
    await a.post('/api/translit').send({ to: 'lat' }).expect(400);
    const j = (await a.get('/api/audit?q=translit').expect(200)).body;
    expect(j.items.some((x: any) => x.entity === 'translit')).toBe(false);
  });

  it("Т-2: бўлим номида ташкилот номи бор бўлса такрорланмайди; энг сўнгги таълим тушади", async () => {
    const org = '“UNICON-SOFT” масъулияти чекланган жамиятининг';
    await a.put('/api/settings').send({ tashkilot_nomi: org }).expect(200);
    const dept = (await a.post('/api/departments').send({ name: `${org} Қорақалпоғистон Республикаси филиали` }).expect(201)).body;
    const pos = (await a.post('/api/positions').send({ title: 'Мижозлар билан ишлаш бўйича менежер', departmentId: dept.id }).expect(201)).body;
    const emp = (await a.post('/api/employees').send({
      tabNumber: '55', firstName: 'Закарья', lastName: 'Муратбаев', departmentId: dept.id, positionId: pos.id, salary: 1, hireDate: '2026-07-01',
      education: [
        { institutionName: 'Академик лицей', speciality: 'Умумий', endYear: 2019 },
        { institutionName: 'Нукус давлат техника университети', speciality: 'Дастурий инжиниринг', studyType: 'кундузги', endYear: 2025 },
      ],
    }).expect(201)).body;
    const g = await a.post('/api/documents/generate/obyektivka').send({ employeeId: emp.id, params: { lang: 'cyr' } }).expect(201);
    const t = text(await fileOf(g.body.id));
    // сарлавҳа сатри ва ҳозирги иш жойи — жами 2 та (олдин 4 та бўларди)
    expect((t.match(/UNICON-SOFT/g) ?? []).length).toBe(2);
    expect(t).toContain('2025 й. Нукус давлат техника университети (кундузги)');
    expect(t).toContain('Дастурий инжиниринг');
    expect(t).not.toContain('Академик лицей');
    // таълим рўйхатини таҳрирлаш: PATCH қаторларни алмаштиради
    await a.patch(`/api/employees/${emp.id}`).send({ education: [{ institutionName: 'Янги университет', endYear: 2030 }] }).expect(200);
    const t2 = text(await fileOf((await a.post('/api/documents/generate/obyektivka').send({ employeeId: emp.id, params: { lang: 'cyr' } }).expect(201)).body.id));
    expect(t2).toContain('2030 й. Янги университет'); expect(t2).not.toContain('Нукус давлат');
  });
});
