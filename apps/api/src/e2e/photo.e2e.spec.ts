import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { existsSync, mkdtempSync, readdirSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import request from 'supertest';

jest.setTimeout(90_000);

// 1x1 haqiqiy PNG va minimal JPEG sarlavhasi
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
const JPG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]), Buffer.from('JFIF\0'), Buffer.alloc(32, 1)]);
const PDF = Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF');

describe('Xodim rasmi va hujjat fayllari (e2e)', () => {
  let app: INestApplication;
  let a: ReturnType<typeof request.agent>;
  let empId: string;
  let dir: string;

  beforeAll(async () => {
    dir = mkdtempSync(join(tmpdir(), 'hrms-uploads-'));
    process.env.UPLOAD_DIR = dir;
    const { prepareTestDb } = await import('./test-db');
    await prepareTestDb('hrms_test_photo');
    process.env.JWT_SECRET = 'test-secret-test-secret-123';
    const { AppModule } = await import('../app.module');
    const { configureApp } = await import('../app.setup');
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    configureApp(app);
    await app.init();
    a = request.agent(app.getHttpServer());
    await a.post('/api/auth/setup').send({ login: 'admin', password: 'Parol-12345', fullName: 'Админ' }).expect(201);
    const dept = (await a.post('/api/departments').send({ name: 'Бўлим' }).expect(201)).body;
    const pos = (await a.post('/api/positions').send({ title: 'Мутахассис', departmentId: dept.id }).expect(201)).body;
    empId = (await a.post('/api/employees').send({ tabNumber: '1', firstName: 'Али', lastName: 'Валиев', departmentId: dept.id, positionId: pos.id }).expect(201)).body.id;
  });
  afterAll(async () => { await app.close(); rmSync(dir, { recursive: true, force: true }); });

  const files = () => readdirSync(dir);
  const photo = (buf: Buffer, name: string, id = empId) => a.post(`/api/employees/${id}/photo`).attach('file', buf, name);

  it('autentifikatsiyasiz 401', async () => {
    await request(app.getHttpServer()).post(`/api/employees/${empId}/photo`).attach('file', PNG, 'a.png').expect(401);
    await request(app.getHttpServer()).get('/api/files/x.png').expect(401);
  });

  it('PNG yuklanadi, nom tasodifiy, kengaytma haqiqiy turdan, fayl xizmat qilinadi', async () => {
    const r = await photo(PNG, 'mening rasmim.PNG').expect(201);
    expect(r.body.photoUrl).toMatch(/^[0-9a-f-]{36}\.png$/);
    expect(files()).toEqual([r.body.photoUrl]);
    const got = await a.get(`/api/files/${r.body.photoUrl}`).expect(200);
    expect(got.headers['content-type']).toMatch(/image\/png/);
    expect((await a.get(`/api/employees/${empId}`)).body.photoUrl).toBe(r.body.photoUrl);
  });

  it("soxta fayl rad etiladi: .jpg nomli, lekin ichida boshqa narsa (diskka yozilmaydi)", async () => {
    const before = files();
    const r = await photo(Buffer.from('MZ\x90\x00 bu exe'), 'virus.jpg').expect(400);
    expect(r.body.message).toMatch(/JPG ёки PNG/);
    await photo(PDF, 'hujjat.png').expect(400);        // PDF rasm sifatida o'tmaydi
    await photo(Buffer.alloc(0), 'bosh.jpg').expect(400);
    expect(files()).toEqual(before);
  });

  it("5 MB dan katta rasm 413 (kirillcha xabar), disk tozaligicha qoladi", async () => {
    const before = files();
    const big = Buffer.concat([JPG, Buffer.alloc(5 * 1024 * 1024 + 10, 7)]);
    const r = await photo(big, 'katta.jpg').expect(413);
    expect(r.body.message).toMatch(/катта/);
    expect(files()).toEqual(before);
  });

  it("almashtirilganda eski fayl diskdan o'chadi", async () => {
    const old = (await a.get(`/api/employees/${empId}`)).body.photoUrl;
    const r = await photo(JPG, 'yangi.jpg').expect(201);
    expect(r.body.photoUrl).toMatch(/\.jpg$/);
    expect(files()).toEqual([r.body.photoUrl]);
    expect(existsSync(join(dir, old))).toBe(false);
  });

  it("DELETE rasmni va faylni o'chiradi; qayta DELETE xato bermaydi", async () => {
    await a.delete(`/api/employees/${empId}/photo`).expect(200);
    expect(files()).toEqual([]);
    expect((await a.get(`/api/employees/${empId}`)).body.photoUrl).toBeNull();
    await a.delete(`/api/employees/${empId}/photo`).expect(200);
  });

  it("mavjud bo'lmagan xodim: 404 va fayl yozilmaydi; noto'g'ri id: 400", async () => {
    await photo(PNG, 'a.png', '00000000-0000-4000-8000-000000000000').expect(404);
    await photo(PNG, 'a.png', 'not-a-uuid').expect(400);
    expect(files()).toEqual([]);
  });

  it('hujjat yuklash: PDF/JPG/PNG ruxsat, boshqasi rad; hujjat o\'chirilganda fayl ham o\'chadi', async () => {
    const up = (buf: Buffer, name: string) => a.post(`/api/employees/${empId}/documents`).field('documentType', 'pasport').attach('file', buf, name);
    const pdf = (await up(PDF, 'pasport.pdf').expect(201)).body;
    expect(pdf.filePath).toMatch(/\.pdf$/);
    await up(Buffer.from('<html>x</html>'), 'x.pdf').expect(400);   // kengaytma pdf, ichi HTML
    expect(files()).toEqual([pdf.filePath]);
    await a.delete(`/api/documents/${pdf.id}`).expect(200);
    expect(files()).toEqual([]);
  });

  it("/files/:name: yo'l hujumi va noto'g'ri nomlar 404", async () => {
    await a.get('/api/files/..%2F..%2Fetc%2Fpasswd').expect(404);
    await a.get('/api/files/..').expect(404);
    await a.get('/api/files/not-a-real-file.png').expect(404);
    await a.get('/api/files/evil.php').expect(404);
  });
});
