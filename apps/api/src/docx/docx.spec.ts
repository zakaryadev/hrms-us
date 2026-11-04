import PizZip from 'pizzip';
import { DocxService } from './docx.service';
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

  it('obyektivka: tsikllar (mehnat faoliyati, qarindoshlar jadvali)', () => {
    const t = text(svc.render(lang, 'obyektivka', {
      ...common, tugilgan_sana: '15.03.1992', tugilgan_joy: "Qo'vasoy", millati: "o'zbek", partiyaviyligi: DOC_STRINGS[lang].none, malumoti: 'Oliy',
      tamomlagan_oliygoh: 'TATU', mutaxassisligi: 'Dasturchi', harbiy_unvoni: DOC_STRINGS[lang].none, ishga_tushgan_sana: '01.05.2026',
      ish_joylari: [{ davr: '2015 — 2020', lavozim_va_joy: 'Dasturchi, ABC' }, { davr: `2020 — ${DOC_STRINGS[lang].present}`, lavozim_va_joy: 'Menejer, XYZ' }],
      qarindoshlar: [
        { qarindoshligi: 'otasi', fish: 'Aliyev A.', tugilgan_yil_joy: "1960, Qo'vasoy", ish_joyi: 'Nafaqada', manzili: "Qo'vasoy" },
        { qarindoshligi: 'onasi', fish: 'Aliyeva B.', tugilgan_yil_joy: "1965, Qo'vasoy", ish_joyi: 'Maktab', manzili: "Qo'vasoy" },
      ],
    }));
    expect(t).not.toMatch(/\{\{|\}\}|\{#|\{\//);
    for (const s of ['Dasturchi, ABC', 'Menejer, XYZ', 'Aliyev A.', 'Aliyeva B.']) expect(t).toContain(s);
    expect(t).toContain(lang === 'cyr' ? 'МАЪЛУМОТНОМА' : "MA'LUMOTNOMA");
    expect(t).toContain(lang === 'cyr' ? 'ҳ.в.' : 'h.v.');
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
