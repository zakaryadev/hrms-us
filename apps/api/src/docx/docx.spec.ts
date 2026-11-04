import { readFileSync } from 'fs';
import { join } from 'path';
import PizZip from 'pizzip';
import { DocxService, TEMPLATE_DIR } from './docx.service';
import { fmtDate, fmtDayMonth, fmtMoney } from './format';

const svc = new DocxService();
const text = (buf: Buffer) =>
  new PizZip(buf).file('word/document.xml')!.asText().replace(/<\/w:p>/g, '\n').replace(/<[^>]+>/g, '').replace(/&apos;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&');

const common = {
  tashkilot_nomi: 'UNICON SOFT', rahbar_fish: 'Karimov A.A.', bosh_direktor_fish: 'Karimov A.A.', shahar: 'Toshkent',
  vakil_fish: 'Vakilov V.V.', ishonchnoma_matni: '12-sonli ishonchnoma', ish_beruvchi_rekvizitlari: 'STIR 123',
  xodim_fish: 'Aliyev Vali Karimovich', amaldagi_filial: "Farg'ona viloyat filiali", amaldagi_bolim: "Qo'vasoy shahar bo'limi",
  amaldagi_lavozim: 'Yetakchi mutaxassis', yangi_filial: 'Toshkent filiali', yangi_lavozim: 'Menejer',
  otkazish_yili: '2026', otkazish_kuni: '2', otkazish_oyi: 'noyabr', otkazish_sanasi: '2-noyabr', ariza_sanasi: '30.10.2026',
};

describe('DocxService shablonlari', () => {
  it.each(['ariza', 'buyruq-otkazish'])('%s: to\'ldiriladi, teg qolmaydi', (name) => {
    const t = text(svc.render(name, { ...common, buyruq_raqami: 'М-142', buyruq_sanasi: '30.10.2026', asos_matni: 'Xodimning arizasi' }));
    expect(t).not.toMatch(/\{\{|\}\}/);
    expect(t).toContain('Aliyev Vali Karimovich');
    expect(t).toContain('Toshkent filiali Menejer');
  });

  it('kelishuv: raqamlar va maosh', () => {
    const t = text(svc.render('kelishuv', {
      ...common, shartnoma_sanasi: '01.05.2026', shartnoma_raqami: '1/130', kelishuv_raqami: '1', kelishuv_sanasi: '02.11.2026',
      oylik_maosh: fmtMoney(5750000), xodim_pasport: 'AB8210665', xodim_pinfl: '12345678901234', xodim_manzil: 'Toshkent',
    }));
    expect(t).not.toMatch(/\{\{|\}\}/);
    expect(t).toContain('01.05.2026 yildagi 1/130-sonli');
    expect(t).toContain('5 750 000 so\'m');
  });

  it("buyruq-tatil: moddiy yordam bandi faqat belgilanganda chiqadi", () => {
    const data = {
      ...common, filial: "Farg'ona viloyat filiali", lavozim: 'Yetakchi mutaxassis', buyruq_raqami: 'T-1', buyruq_sanasi: '04.11.2026',
      ish_yili_boshi: '01.05.2026', ish_yili_oxiri: '30.04.2027', asosiy_kun: 21, qoshimcha_kun: 6, jami_kun: 27,
      boshlanish_yili: '2026', boshlanish_sanasi: '16-noyabr', chiqish_yili: '2026', ishga_chiqish_sanasi: '14-dekabr',
    };
    const on = text(svc.render('buyruq-tatil', { ...data, moddiy_yordam: true }));
    const off = text(svc.render('buyruq-tatil', { ...data, moddiy_yordam: false }));
    expect(on).toContain('moddiy yordam');
    expect(off).not.toContain('moddiy yordam');
    expect(on).toContain('jami 27 kalendar kun');
    expect(on).toContain('2026-yil 14-dekabr');
    expect(off).not.toMatch(/\{\{|\}\}/);
  });

  it("obyektivka: tsikllar (mehnat faoliyati, qarindoshlar jadvali)", () => {
    const t = text(svc.render('obyektivka', {
      ...common, tugilgan_sana: '15.03.1992', tugilgan_joy: 'Qo\'vasoy', millati: "o'zbek", partiyaviyligi: "yo'q", malumoti: 'Oliy',
      tamomlagan_oliygoh: 'TATU', mutaxassisligi: 'Dasturchi', harbiy_unvoni: "yo'q", ishga_tushgan_sana: '01.05.2026',
      ish_joylari: [{ davr: '2015 — 2020', lavozim_va_joy: 'Dasturchi, ABC' }, { davr: '2020 — h.v.', lavozim_va_joy: 'Menejer, XYZ' }],
      qarindoshlar: [
        { qarindoshligi: 'otasi', fish: 'Aliyev A.', tugilgan_yil_joy: '1960, Qo\'vasoy', ish_joyi: 'Nafaqada', manzili: 'Qo\'vasoy' },
        { qarindoshligi: 'onasi', fish: 'Aliyeva B.', tugilgan_yil_joy: '1965, Qo\'vasoy', ish_joyi: 'Maktab', manzili: 'Qo\'vasoy' },
      ],
    }));
    expect(t).not.toMatch(/\{\{|\}\}|\{#|\{\//);
    for (const s of ['Dasturchi, ABC', 'Menejer, XYZ', 'Aliyev A.', 'Aliyeva B.']) expect(t).toContain(s);
  });

  it("noma'lum teg bo'lsa ham bo'sh qiymat bilan to'ldiriladi", () => {
    expect(() => svc.render('ariza', {})).not.toThrow();
  });

  it('shablon topilmasa aniq xato', () => {
    expect(() => svc.render('yoq-shablon', {})).toThrow(/Shablon topilmadi/);
  });
});

describe('format', () => {
  it('sana va summa', () => {
    expect(fmtDate('2026-11-02')).toBe('02.11.2026');
    expect(fmtDayMonth('2026-11-02')).toBe('2-noyabr');
    expect(fmtMoney(5750000)).toBe('5 750 000');
  });
  it('shablonlar papkasi mavjud', () => {
    expect(() => readFileSync(join(TEMPLATE_DIR, 'ariza.docx'))).not.toThrow();
  });
});
