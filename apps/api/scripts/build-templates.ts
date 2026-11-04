/**
 * Namunaviy DOCX shablonlarni yaratadi: templates/lat/*.docx (lotin) va templates/cyr/*.docx (kirill).
 * Foydalanuvchi ularni o'z shabloni bilan almashtirishi mumkin: faqat {{o'zgaruvchi}} nomlari saqlansa bas.
 * Ishga tushirish: npx ts-node scripts/build-templates.ts
 */
import {
  AlignmentType, Document, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType,
} from 'docx';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

type Lang = 'lat' | 'cyr';
const FONT = 'Times New Roman';
const SIZE = 28; // 14pt

const p = (text: string, o: { bold?: boolean; align?: (typeof AlignmentType)[keyof typeof AlignmentType]; after?: number; indent?: boolean; size?: number } = {}) =>
  new Paragraph({
    alignment: o.align ?? AlignmentType.JUSTIFIED,
    spacing: { after: o.after ?? 160 },
    indent: o.indent ? { firstLine: 720 } : undefined,
    children: [new TextRun({ text, bold: o.bold, font: FONT, size: o.size ?? SIZE })],
  });
const left = (t: string, after?: number) => p(t, { align: AlignmentType.LEFT, after });
const center = (t: string, bold = true) => p(t, { align: AlignmentType.CENTER, bold });
const right = (t: string) => p(t, { align: AlignmentType.RIGHT });
const cell = (text: string, w: number, bold = false) =>
  new TableCell({ width: { size: w, type: WidthType.PERCENTAGE }, children: [p(text, { bold, align: AlignmentType.LEFT, after: 60, size: 24 })] });
const doc = (children: (Paragraph | Table)[]) =>
  new Document({
    sections: [{ properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1134, bottom: 1134, left: 1701, right: 850 } } }, children }],
  });
const none = { style: 'none', size: 0, color: 'FFFFFF' };
const sign = (l: string, r: string) =>
  new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: { top: none, bottom: none, left: none, right: none, insideHorizontal: none, insideVertical: none } as any,
    rows: [new TableRow({ children: [cell(l, 50), cell(r, 50)] })],
  });

/** Matnlar: o'zgaruvchi nomlari ikkala tilda bir xil, faqat atrofdagi matn farq qiladi. */
const TXT: Record<Lang, Record<string, string>> = {
  lat: {
    obyTitle: "MA'LUMOTNOMA", birth: "Tug'ilgan sana", birthPlace: "Tug'ilgan joyi", nat: 'Millati', party: 'Partiyaviyligi', edu: "Ma'lumoti",
    univ: 'Tamomlagan oliygohi', spec: 'Mutaxassisligi', mil: 'Harbiy unvoni', pos: 'Amaldagi lavozimi', branch: 'Amaldagi filiali',
    hired: 'Ishga kirgan sanasi', work: 'MEHNAT FAOLIYATI', rel: 'QARINDOSHLARI',
    h1: 'Qarindoshligi', h2: 'F.I.Sh.', h3: "Tug'ilgan yili va joyi", h4: 'Ish joyi va lavozimi', h5: 'Yashash manzili',
    toDirector: 'bosh direktori {{rahbar_fish}}ga', fromEmp: '{{amaldagi_lavozim}}i {{xodim_fish}}dan', application: 'ARIZA',
    appBody: "Meni {{otkazish_yili}}-yil {{otkazish_kuni}}-{{otkazish_oyi}}dan o'z xohishimga ko'ra {{yangi_filial}} {{yangi_lavozim}} lavozimiga doimiy asosda o'tkazishingizni so'rayman.",
    year: 'yil', city: 'sh.',
    agrTitle1: "{{shartnoma_sanasi}} yildagi {{shartnoma_raqami}}-sonli mehnat shartnomasiga", agrTitle2: "{{kelishuv_raqami}}-sonli qo'shimcha KELISHUV",
    employer: 'ISH BERUVCHI', employee: 'XODIM',
    party1: '"ISH BERUVCHI": {{tashkilot_nomi}} nomidan {{ishonchnoma_matni}} asosida ish yurituvchi {{vakil_fish}} bir tomondan, va',
    party2: '"XODIM": {{xodim_fish}} ikkinchi tomondan quyidagilar bo\'yicha kelishuv tuzdilar:',
    a1: "1. Xodim {{otkazish_yili}}-yil {{otkazish_sanasi}}dan e'tiboran {{yangi_filial}} {{yangi_lavozim}} lavozimiga doimiy asosda o'tkazilsin.",
    a2: "2. Mehnat shartnomasining 2.1-bandidagi oylik maosh {{oylik_maosh}} so'm etib belgilansin.",
    a3: "3. Ushbu kelishuv ikki nusxada tuzilgan bo'lib, har bir tomonda bittadan nusxa saqlanadi va mehnat shartnomasining ajralmas qismi hisoblanadi.",
    reqs: 'Tomonlarning yuridik manzillari va rekvizitlari:', empReq: 'Pasport: {{xodim_pasport}}; JSHSHIR: {{xodim_pinfl}}; Manzil: {{xodim_manzil}}',
    order: 'BUYRUQ', transferT: "Boshqa ishga doimiy o'tkazish to'g'risida", leaveT: "Mehnat ta'tili berish to'g'risida", command: 'BUYURAMAN:',
    o1: "1. {{amaldagi_filial}} {{amaldagi_lavozim}}i bo'lib ishlab kelayotgan {{xodim_fish}} {{otkazish_yili}}-yil {{otkazish_sanasi}}dan e'tiboran {{yangi_filial}} {{yangi_lavozim}} lavozimiga doimiy asosda o'tkazilsin.",
    o2: '2. Ish haqi shtatlar jadvaliga asosan belgilansin.', basis: 'Asos: {{asos_matni}}.',
    l1: "1. {{filial}} {{lavozim}}i {{xodim_fish}}ga uning {{ish_yili_boshi}} dan {{ish_yili_oxiri}} gacha bo'lgan ish davri uchun {{asosiy_kun}} kalendar kun asosiy va {{qoshimcha_kun}} kalendar kun qo'shimcha, jami {{jami_kun}} kalendar kun mehnat ta'tili {{boshlanish_yili}}-yil {{boshlanish_sanasi}}dan berilsin.",
    l2: "2. Xodimning ta'tildan ishga chiqish sanasi {{chiqish_yili}}-yil {{ishga_chiqish_sanasi}} deb belgilansin.",
    l3: "3. Buxgalteriya bo'limi tegishli to'lovlarni amalga oshirsin.",
    l4: "{{#moddiy_yordam}}4. Xodimga ta'til uchun moddiy yordam sifatida bir oylik ish haqi miqdorida qo'shimcha to'lov to'lansin.{{/moddiy_yordam}}",
  },
  cyr: {
    obyTitle: 'МАЪЛУМОТНОМА', birth: 'Туғилган санаси', birthPlace: 'Туғилган жойи', nat: 'Миллати', party: 'Партиявийлиги', edu: 'Маълумоти',
    univ: 'Тамомлаган олийгоҳи', spec: 'Мутахассислиги', mil: 'Ҳарбий унвони', pos: 'Амалдаги лавозими', branch: 'Амалдаги филиали',
    hired: 'Ишга кирган санаси', work: 'МЕҲНАТ ФАОЛИЯТИ', rel: 'ҚАРИНДОШЛАРИ',
    h1: 'Қариндошлиги', h2: 'Ф.И.Ш.', h3: 'Туғилган йили ва жойи', h4: 'Иш жойи ва лавозими', h5: 'Яшаш манзили',
    toDirector: 'бош директори {{rahbar_fish}}га', fromEmp: '{{amaldagi_lavozim}}и {{xodim_fish}}дан', application: 'АРИЗА',
    appBody: 'Мени {{otkazish_yili}}-йил {{otkazish_kuni}}-{{otkazish_oyi}}дан ўз хоҳишимга кўра {{yangi_filial}} {{yangi_lavozim}} лавозимига доимий асосда ўтказишингизни сўрайман.',
    year: 'йил', city: 'ш.',
    agrTitle1: '{{shartnoma_sanasi}} йилдаги {{shartnoma_raqami}}-сонли меҳнат шартномасига', agrTitle2: '{{kelishuv_raqami}}-сонли қўшимча КЕЛИШУВ',
    employer: 'ИШ БЕРУВЧИ', employee: 'ХОДИМ',
    party1: '«ИШ БЕРУВЧИ»: {{tashkilot_nomi}} номидан {{ishonchnoma_matni}} асосида иш юритувчи {{vakil_fish}} бир томондан, ва',
    party2: '«ХОДИМ»: {{xodim_fish}} иккинчи томондан қуйидагилар бўйича келишув тузишдилар:',
    a1: '1. Ходим {{otkazish_yili}}-йил {{otkazish_sanasi}}дан эътиборан {{yangi_filial}} {{yangi_lavozim}} лавозимига доимий асосда ўтказилсин.',
    a2: '2. Меҳнат шартномасининг 2.1-бандидаги ойлик маош {{oylik_maosh}} сўм этиб белгилансин.',
    a3: '3. Ушбу келишув икки нусхада тузилган бўлиб, ҳар бир томонда биттадан нусха сақланади ва меҳнат шартномасининг ажралмас қисми ҳисобланади.',
    reqs: 'Томонларнинг юридик манзиллари ва реквизитлари:', empReq: 'Паспорт: {{xodim_pasport}}; ЖШШИР: {{xodim_pinfl}}; Манзил: {{xodim_manzil}}',
    order: 'БУЙРУҚ', transferT: 'Бошқа ишга доимий ўтказиш тўғрисида', leaveT: 'Меҳнат таътили бериш тўғрисида', command: 'БУЮРАМАН:',
    o1: '1. {{amaldagi_filial}} {{amaldagi_lavozim}}и бўлиб ишлаб келаётган {{xodim_fish}} {{otkazish_yili}}-йил {{otkazish_sanasi}}дан эътиборан {{yangi_filial}} {{yangi_lavozim}} лавозимига доимий асосда ўтказилсин.',
    o2: '2. Иш ҳақи штатлар жадвалига асосан белгилансин.', basis: 'Асос: {{asos_matni}}.',
    l1: '1. {{filial}} {{lavozim}}и {{xodim_fish}}га унинг {{ish_yili_boshi}} дан {{ish_yili_oxiri}} гача бўлган иш даври учун {{asosiy_kun}} календар кун асосий ва {{qoshimcha_kun}} календар кун қўшимча, жами {{jami_kun}} календар кун меҳнат таътили {{boshlanish_yili}}-йил {{boshlanish_sanasi}}дан берилсин.',
    l2: '2. Ходимнинг таътилдан ишга чиқиш санаси {{chiqish_yili}}-йил {{ishga_chiqish_sanasi}} деб белгилансин.',
    l3: '3. Бухгалтерия бўлими тегишли тўловларни амалга оширсин.',
    l4: '{{#moddiy_yordam}}4. Ходимга таътил учун моддий ёрдам сифатида бир ойлик иш ҳақи миқдорида қўшимча тўлов тўлансин.{{/moddiy_yordam}}',
  },
};

function templates(lang: Lang): Record<string, Document> {
  const t = TXT[lang];
  return {
    obyektivka: doc([
      center(t.obyTitle), center('{{xodim_fish}}'),
      left(`${t.birth}: {{tugilgan_sana}}`), left(`${t.birthPlace}: {{tugilgan_joy}}`), left(`${t.nat}: {{millati}}`),
      left(`${t.party}: {{partiyaviyligi}}`), left(`${t.edu}: {{malumoti}}`), left(`${t.univ}: {{tamomlagan_oliygoh}}`),
      left(`${t.spec}: {{mutaxassisligi}}`), left(`${t.mil}: {{harbiy_unvoni}}`), left(`${t.pos}: {{amaldagi_lavozim}}`),
      left(`${t.branch}: {{amaldagi_filial}}`), left(`${t.hired}: {{ishga_tushgan_sana}}`),
      center(t.work),
      left('{{#ish_joylari}}', 0), left('{{davr}} — {{lavozim_va_joy}}', 60), left('{{/ish_joylari}}', 0),
      center(t.rel),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({ children: [t.h1, t.h2, t.h3, t.h4, t.h5].map((h) => cell(h, 20, true)) }),
          new TableRow({ children: [cell('{{#qarindoshlar}}{{qarindoshligi}}', 20), cell('{{fish}}', 20), cell('{{tugilgan_yil_joy}}', 20), cell('{{ish_joyi}}', 20), cell('{{manzili}}{{/qarindoshlar}}', 20)] }),
        ],
      }),
    ]),

    ariza: doc([
      right('"{{tashkilot_nomi}}"'), right(t.toDirector), right('{{amaldagi_filial}} {{amaldagi_bolim}}'), right(t.fromEmp),
      p('', { after: 240 }), center(t.application),
      p(t.appBody, { indent: true }), p('', { after: 240 }),
      sign(`{{ariza_sanasi}} ${t.year}`, '{{xodim_fish}}'),
    ]),

    kelishuv: doc([
      center(t.agrTitle1), center(t.agrTitle2),
      sign(`{{shahar}} ${t.city}`, `{{kelishuv_sanasi}} ${t.year}`), p('', { after: 120 }),
      p(t.party1, { indent: true }), p(t.party2, { indent: true }),
      p(t.a1, { indent: true }), p(t.a2, { indent: true }), p(t.a3, { indent: true }),
      center(t.reqs),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({ children: [cell(t.employer, 50, true), cell(t.employee, 50, true)] }),
          new TableRow({ children: [cell('{{tashkilot_nomi}}', 50), cell('{{xodim_fish}}', 50)] }),
          new TableRow({ children: [cell('{{ish_beruvchi_rekvizitlari}}', 50), cell(t.empReq, 50)] }),
          new TableRow({ children: [cell('_______________ {{vakil_fish}}', 50), cell('_______________ {{xodim_fish}}', 50)] }),
        ],
      }),
    ]),

    'buyruq-otkazish': doc([
      center(t.order), sign(`{{buyruq_sanasi}} ${t.year}`, '№ {{buyruq_raqami}}'), center(t.transferT),
      p(t.command, { bold: true, align: AlignmentType.LEFT }),
      p(t.o1, { indent: true }), p(t.o2, { indent: true }), p(t.basis, { indent: true }),
      p('', { after: 240 }), left('{{imzolovchi}}: _________________ {{bosh_direktor_fish}}'),
    ]),

    'buyruq-tatil': doc([
      center(t.order), sign(`{{buyruq_sanasi}} ${t.year}`, '№ {{buyruq_raqami}}'), center(t.leaveT),
      p(t.command, { bold: true, align: AlignmentType.LEFT }),
      p(t.l1, { indent: true }), p(t.l2, { indent: true }), p(t.l3, { indent: true }), p(t.l4, { indent: true }),
      p(t.basis, { indent: true }),
      p('', { after: 240 }), left('{{imzolovchi}}: _________________ {{bosh_direktor_fish}}'),
    ]),
  };
}

async function main() {
  for (const lang of ['lat', 'cyr'] as const) {
    const dir = join(__dirname, '..', 'templates', lang);
    mkdirSync(dir, { recursive: true });
    for (const [name, d] of Object.entries(templates(lang))) {
      writeFileSync(join(dir, `${name}.docx`), await Packer.toBuffer(d));
      console.log('yaratildi:', lang, name);
    }
  }
}
main();
