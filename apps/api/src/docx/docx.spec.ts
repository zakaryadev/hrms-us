import PizZip from 'pizzip';
import { DocxService, imageInfo } from './docx.service';
import { fmtDate, fmtDayMonth, fmtMoney, monthName, toLang } from './format';
import { DOC_STRINGS } from './strings';

const svc = new DocxService();
const text = (buf: Buffer) =>
  new PizZip(buf).file('word/document.xml')!.asText().replace(/<\/w:p>/g, '\n').replace(/<[^>]+>/g, '')
    .replace(/&apos;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&');

const common = {
  tashkilot_nomi: 'UNICON SOFT', rahbar_fish: 'Karimov A.A.', bosh_direktor_fish: 'Karimov A.A.', shahar: 'Toshkent',
  vakil_fish: 'Vakilov V.V.', ishonchnoma_matni: '12-sonli ishonchnoma', ish_beruvchi_rekvizitlari: 'STIR 123',
  xodim_fish: 'Aliyev Vali Karimovich', amaldagi_filial: "Farg'ona viloyat filiali", amaldagi_bolim: "Qo'vasoy shahar bo'limi",
  amaldagi_lavozim: 'Yetakchi mutaxassis', yangi_filial: 'Toshkent filiali', yangi_lavozim: 'Menejer',
  otkazish_yili: '2026', otkazish_kuni: '2', otkazish_oyi: 'noyabr', otkazish_sanasi: '2-noyabr', ariza_sanasi: '30.10.2026',
  imzolovchi: 'Bosh direktor',
};

describe.each([['lat'], ['cyr']] as const)('DOCX shablonlari (%s)', (lang) => {
  const heading = lang === 'cyr' ? 'БУЙРУҚ' : 'BUYRUQ';

  it.each(['ariza', 'buyruq-otkazish'])("%s: to'ldiriladi, teg qolmaydi", (name) => {
    const t = text(svc.render(lang, name, { ...common, buyruq_raqami: 'М-142', buyruq_sanasi: '30.10.2026', asos_matni: 'Xodimning arizasi' }));
    expect(t).not.toMatch(/\{\{|\}\}/);
    expect(t).toContain('Aliyev Vali Karimovich');
    expect(t).toContain('Toshkent filiali Menejer');
    if (name === 'buyruq-otkazish') expect(t).toContain(heading);
    if (name === 'ariza') expect(t).toContain(lang === 'cyr' ? 'АРИЗА' : 'ARIZA');
  });

  it('kelishuv: raqamlar va maosh', () => {
    const t = text(svc.render(lang, 'kelishuv', {
      ...common, shartnoma_sanasi: '01.05.2026', shartnoma_raqami: '1/130', kelishuv_raqami: '1', kelishuv_sanasi: '02.11.2026',
      oylik_maosh: fmtMoney(5750000), xodim_pasport: 'AB8210665', xodim_pinfl: '12345678901234', xodim_manzil: 'Toshkent',
    }));
    expect(t).not.toMatch(/\{\{|\}\}/);
    expect(t).toContain(lang === 'cyr' ? '01.05.2026 йилдаги 1/130-сонли' : '01.05.2026 yildagi 1/130-sonli');
    expect(t).toContain(lang === 'cyr' ? "5 750 000 сўм" : "5 750 000 so'm");
  });

  it('buyruq-tatil: moddiy yordam bandi faqat belgilanganda chiqadi', () => {
    const data = {
      ...common, filial: "Farg'ona viloyat filiali", lavozim: 'Yetakchi mutaxassis', buyruq_raqami: 'T-1', buyruq_sanasi: '04.11.2026',
      ish_yili_boshi: '01.05.2026', ish_yili_oxiri: '30.04.2027', asosiy_kun: 21, qoshimcha_kun: 6, jami_kun: 27,
      boshlanish_yili: '2026', boshlanish_sanasi: fmtDayMonth('2026-11-16', lang), chiqish_yili: '2026', ishga_chiqish_sanasi: fmtDayMonth('2026-12-14', lang),
      asos_matni: 'Mehnat kodeksining 217-moddasi hamda xodimning arizasi', imzolovchi: "Bosh direktor o'rinbosari",
    };
    const on = text(svc.render(lang, 'buyruq-tatil', { ...data, moddiy_yordam: true }));
    const off = text(svc.render(lang, 'buyruq-tatil', { ...data, moddiy_yordam: false }));
    const aid = lang === 'cyr' ? 'моддий ёрдам' : 'moddiy yordam';
    expect(on).toContain(aid);
    expect(off).not.toContain(aid);
    expect(on).toContain(lang === 'cyr' ? 'жами 27 календар кун' : 'jami 27 kalendar kun');
    expect(on).toContain(lang === 'cyr' ? '2026-йил 14-декабр' : '2026-yil 14-dekabr');
    expect(on).toContain('Asos: Mehnat kodeksining 217-moddasi'.replace('Asos', lang === 'cyr' ? 'Асос' : 'Asos'));
    expect(on).toContain("Bosh direktor o'rinbosari: _");
    expect(on).toContain(heading);
    expect(off).not.toMatch(/\{\{|\}\}/);
  });

  const T2 = (over: Record<string, unknown> = {}) => ({
    ...common, ishga_kirish_matn: '2026-yil 01 mayda', tugilgan_sana: '15.03.1992', tugilgan_joy_1: "Qo'vasoy viloyati,", tugilgan_joy_2: 'Marg\'ilon shahri',
    millati: "o'zbek", partiyaviyligi: DOC_STRINGS[lang].none, malumoti: 'Oliy', tamomlagan: '2015 TATU', mutaxassisligi: 'Dasturchi',
    ilmiy_daraja: DOC_STRINGS[lang].none, ilmiy_unvon: DOC_STRINGS[lang].none, chet_tillari: 'Ingliz tili', harbiy_unvoni: DOC_STRINGS[lang].none,
    mukofotlar: DOC_STRINGS[lang].none, deputatlik: DOC_STRINGS[lang].none,
    ish_joylari: [{ davr: '2015-2020 yy.', joy: 'ABC - Dasturchi' }, { davr: `2020 y. - ${DOC_STRINGS[lang].present}`, joy: 'XYZ Menejer' }],
    qarindoshlar: [
      { qarindoshligi: 'otasi', fish: 'Aliyev A.', tugilgan_yil_joy: "1960, Qo'vasoy", ish_joyi: 'Nafaqada', manzili: "Qo'vasoy" },
      { qarindoshligi: 'onasi', fish: 'Aliyeva B.', tugilgan_yil_joy: "1965, Qo'vasoy", ish_joyi: 'Maktab', manzili: "Qo'vasoy" },
    ], ...over,
  });

  it('obyektivka (T-2, namunadan 1:1): tsikllar, tug\'ilgan joy ikki qator, hamma maydonlar', () => {
    const t = text(svc.render(lang, 'obyektivka', T2()));
    expect(t).not.toMatch(/\{\{|\}\}|\{#|\{\//);
    for (const s of ['2015-2020 yy.', 'ABC - Dasturchi', 'XYZ Menejer', 'Aliyev A.', 'Aliyeva B.', "Qo'vasoy viloyati,", "Marg'ilon shahri", 'Ingliz tili', '2015 TATU', '2026-yil 01 mayda'])
      expect(t).toContain(s);
    expect(t).toContain(lang === 'cyr' ? 'МАЪЛУМОТНОМА' : "MA'LUMOTNOMA");
    expect(t).toContain(lang === 'cyr' ? 'ҳ.в.' : 'h.v.');
    expect(t).toContain(lang === 'cyr' ? 'яқин қариндошлари ҳақида' : 'yaqin qarindoshlari haqida');
  });

  it("obyektivka: tug'ilgan joyning ikkinchi qatori bo'sh bo'lsa abzats qolmaydi; qarindoshsiz ham xato yo'q", () => {
    const xml = (o: Record<string, unknown>) => new PizZip(svc.render(lang, 'obyektivka', T2(o))).file('word/document.xml')!.asText();
    const paras = (x: string) => (x.match(/<w:p[ >]/g) ?? []).length;
    expect(paras(xml({ tugilgan_joy_2: '' }))).toBe(paras(xml({})) - 1);
    expect(() => svc.render(lang, 'obyektivka', T2({ qarindoshlar: [], ish_joylari: [] }))).not.toThrow();
  });

  it('obyektivka: xodim rasmi shablondagi rasm o\'rniga qo\'yiladi (PNG/JPEG, kesib moslashtiriladi), buzuq rasm e\'tiborsiz', () => {
    // 2x2 PNG (to'g'ri CRC shart emas — faqat sarlavha o'qiladi) va oddiy JPEG sarlavhasi
    const png = Buffer.concat([Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex'), Buffer.from('00000064000000c8', 'hex'), Buffer.alloc(20)]);   // 100x200
    const out = new PizZip(svc.render(lang, 'obyektivka', T2(), { photo: png }));
    expect(out.file('word/media/photo.png')).toBeTruthy();
    const x = out.file('word/document.xml')!.asText();
    expect(x).toMatch(/<a:srcRect l="0" t="\d+" r="0" b="\d+"\/>/);   // tor-uzun rasm: tepa/pastdan kesiladi
    expect(out.file('word/_rels/document.xml.rels')!.asText()).toContain('media/photo.png');
    expect(imageInfo(png)).toEqual({ ext: 'png', w: 100, h: 200 });
    const jpg = Buffer.from('ffd8ffe000104a46494600010100000100010000ffc0001108012c01900301220002110103110100', 'hex');   // 400x300 (h=300,w=400)
    expect(imageInfo(jpg)).toEqual({ ext: 'jpg', w: 400, h: 300 });
    const out2 = new PizZip(svc.render(lang, 'obyektivka', T2(), { photo: jpg }));
    expect(out2.file('word/media/photo.jpg')).toBeTruthy();
    expect(out2.file('[Content_Types].xml')!.asText()).toMatch(/Extension="jpg"/);
    const bad = new PizZip(svc.render(lang, 'obyektivka', T2(), { photo: Buffer.from('bu rasm emas') }));
    expect(bad.file('word/media/photo.png')).toBeNull();
  });

  it("noma'lum teg bo'lsa ham bo'sh qiymat bilan to'ldiriladi", () => {
    expect(() => svc.render(lang, 'ariza', {})).not.toThrow();
  });
});

describe('DocxService xatolari', () => {
  it('shablon topilmasa aniq xato', () => {
    expect(() => svc.render('lat', 'yoq-shablon', {})).toThrow(/Шаблон топилмади/);
  });
});

describe('format', () => {
  it('sana, oy nomlari va summa', () => {
    expect(fmtDate('2026-11-02')).toBe('02.11.2026');
    expect(fmtDayMonth('2026-11-02', 'lat')).toBe('2-noyabr');
    expect(fmtDayMonth('2026-11-02', 'cyr')).toBe('2-ноябр');
    expect(monthName('2026-12-08', 'cyr')).toBe('декабр');
    expect(fmtMoney(5750000)).toBe('5 750 000');
  });
  it("til: standart kirill, faqat 'lat' lotin", () => {
    expect(toLang(undefined)).toBe('cyr');
    expect(toLang('lat')).toBe('lat');
    expect(toLang('xx')).toBe('cyr');
  });
});
