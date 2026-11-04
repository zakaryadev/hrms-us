/**
 * Namunaviy DOCX shablonlarni yaratadi (apps/api/templates). Foydalanuvchi ularni o'z shabloni bilan
 * almashtirishi mumkin: faqat {{o'zgaruvchi}} nomlari saqlansa bas.
 * Ishga tushirish: npx ts-node scripts/build-templates.ts
 */
import {
  AlignmentType, Document, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType,
} from 'docx';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

const FONT = 'Times New Roman';
const SIZE = 28; // 14pt

const p = (text: string, o: { bold?: boolean; align?: (typeof AlignmentType)[keyof typeof AlignmentType]; after?: number; indent?: boolean; size?: number } = {}) =>
  new Paragraph({
    alignment: o.align ?? AlignmentType.JUSTIFIED,
    spacing: { after: o.after ?? 160 },
    indent: o.indent ? { firstLine: 720 } : undefined,
    children: [new TextRun({ text, bold: o.bold, font: FONT, size: o.size ?? SIZE })],
  });
const center = (t: string, bold = true) => p(t, { align: AlignmentType.CENTER, bold });
const right = (t: string) => p(t, { align: AlignmentType.RIGHT });
const cell = (text: string, w: number, bold = false) =>
  new TableCell({ width: { size: w, type: WidthType.PERCENTAGE }, children: [p(text, { bold, align: AlignmentType.LEFT, after: 60, size: 24 })] });
const doc = (children: (Paragraph | Table)[]) =>
  new Document({
    sections: [{ properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1134, bottom: 1134, left: 1701, right: 850 } } }, children }],
  });

const sign = (left: string, rightText: string) =>
  new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: { top: { style: 'none', size: 0, color: 'FFFFFF' }, bottom: { style: 'none', size: 0, color: 'FFFFFF' }, left: { style: 'none', size: 0, color: 'FFFFFF' }, right: { style: 'none', size: 0, color: 'FFFFFF' }, insideHorizontal: { style: 'none', size: 0, color: 'FFFFFF' }, insideVertical: { style: 'none', size: 0, color: 'FFFFFF' } } as any,
    rows: [new TableRow({ children: [cell(left, 50), cell(rightText, 50)] })],
  });

const templates: Record<string, Document> = {
  obyektivka: doc([
    center("MA'LUMOTNOMA"),
    center('{{xodim_fish}}', true),
    p("Tug'ilgan sana: {{tugilgan_sana}}", { align: AlignmentType.LEFT }),
    p("Tug'ilgan joyi: {{tugilgan_joy}}", { align: AlignmentType.LEFT }),
    p('Millati: {{millati}}', { align: AlignmentType.LEFT }),
    p('Partiyaviyligi: {{partiyaviyligi}}', { align: AlignmentType.LEFT }),
    p("Ma'lumoti: {{malumoti}}", { align: AlignmentType.LEFT }),
    p('Tamomlagan oliygohi: {{tamomlagan_oliygoh}}', { align: AlignmentType.LEFT }),
    p('Mutaxassisligi: {{mutaxassisligi}}', { align: AlignmentType.LEFT }),
    p("Harbiy unvoni: {{harbiy_unvoni}}", { align: AlignmentType.LEFT }),
    p('Amaldagi lavozimi: {{amaldagi_lavozim}}', { align: AlignmentType.LEFT }),
    p('Amaldagi filiali: {{amaldagi_filial}}', { align: AlignmentType.LEFT }),
    p('Ishga kirgan sanasi: {{ishga_tushgan_sana}}', { align: AlignmentType.LEFT }),
    center('MEHNAT FAOLIYATI'),
    p('{{#ish_joylari}}', { align: AlignmentType.LEFT, after: 0 }),
    p('{{davr}} — {{lavozim_va_joy}}', { align: AlignmentType.LEFT, after: 60 }),
    p('{{/ish_joylari}}', { align: AlignmentType.LEFT, after: 0 }),
    center('QARINDOSHLARI'),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({ children: ['Qarindoshligi', 'F.I.Sh.', "Tug'ilgan yili va joyi", 'Ish joyi va lavozimi', 'Yashash manzili'].map((h) => cell(h, 20, true)) }),
        new TableRow({ children: [cell('{{#qarindoshlar}}{{qarindoshligi}}', 20), cell('{{fish}}', 20), cell('{{tugilgan_yil_joy}}', 20), cell('{{ish_joyi}}', 20), cell('{{manzili}}{{/qarindoshlar}}', 20)] }),
      ],
    }),
  ]),

  ariza: doc([
    right('"{{tashkilot_nomi}}"'),
    right('bosh direktori {{rahbar_fish}}ga'),
    right('{{amaldagi_filial}} {{amaldagi_bolim}}'),
    right('{{amaldagi_lavozim}}i {{xodim_fish}}dan'),
    p('', { after: 240 }),
    center('ARIZA'),
    p("Meni {{otkazish_yili}}-yil {{otkazish_kuni}}-{{otkazish_oyi}}dan o'z xohishimga ko'ra {{yangi_filial}} {{yangi_lavozim}} lavozimiga doimiy asosda o'tkazishingizni so'rayman.", { indent: true }),
    p('', { after: 240 }),
    sign('{{ariza_sanasi}} yil', '{{xodim_fish}}'),
  ]),

  kelishuv: doc([
    center("{{shartnoma_sanasi}} yildagi {{shartnoma_raqami}}-sonli mehnat shartnomasiga"),
    center("{{kelishuv_raqami}}-sonli qo'shimcha KELISHUV"),
    sign('{{shahar}} sh.', '{{kelishuv_sanasi}} yil'),
    p('', { after: 120 }),
    p('"ISH BERUVCHI": {{tashkilot_nomi}} nomidan {{ishonchnoma_matni}} asosida ish yurituvchi {{vakil_fish}} bir tomondan, va', { indent: true }),
    p('"XODIM": {{xodim_fish}} ikkinchi tomondan quyidagilar bo\'yicha kelishuv tuzdilar:', { indent: true }),
    p("1. Xodim {{otkazish_yili}}-yil {{otkazish_sanasi}}dan e'tiboran {{yangi_filial}} {{yangi_lavozim}} lavozimiga doimiy asosda o'tkazilsin.", { indent: true }),
    p("2. Mehnat shartnomasining 2.1-bandidagi oylik maosh {{oylik_maosh}} so'm etib belgilansin.", { indent: true }),
    p("3. Ushbu kelishuv ikki nusxada tuzilgan bo'lib, har bir tomonda bittadan nusxa saqlanadi va mehnat shartnomasining ajralmas qismi hisoblanadi.", { indent: true }),
    center('Tomonlarning yuridik manzillari va rekvizitlari:'),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({ children: [cell('ISH BERUVCHI', 50, true), cell('XODIM', 50, true)] }),
        new TableRow({ children: [cell('{{tashkilot_nomi}}', 50), cell('{{xodim_fish}}', 50)] }),
        new TableRow({ children: [cell('{{ish_beruvchi_rekvizitlari}}', 50), cell('Pasport: {{xodim_pasport}}; JSHSHIR: {{xodim_pinfl}}; Manzil: {{xodim_manzil}}', 50)] }),
        new TableRow({ children: [cell('_______________ {{vakil_fish}}', 50), cell('_______________ {{xodim_fish}}', 50)] }),
      ],
    }),
  ]),

  'buyruq-otkazish': doc([
    center('BUYRUQ'),
    sign('{{buyruq_sanasi}} yil', '№ {{buyruq_raqami}}'),
    center("Boshqa ishga doimiy o'tkazish to'g'risida"),
    p('BUYURAMAN:', { bold: true, align: AlignmentType.LEFT }),
    p("1. {{amaldagi_filial}} {{amaldagi_lavozim}}i bo'lib ishlab kelayotgan {{xodim_fish}} {{otkazish_yili}}-yil {{otkazish_sanasi}}dan e'tiboran {{yangi_filial}} {{yangi_lavozim}} lavozimiga doimiy asosda o'tkazilsin.", { indent: true }),
    p('2. Ish haqi shtatlar jadvaliga asosan belgilansin.', { indent: true }),
    p('Asos: {{asos_matni}}.', { indent: true }),
    p('', { after: 240 }),
    p('Bosh direktor: _________________ {{bosh_direktor_fish}}', { align: AlignmentType.LEFT }),
  ]),

  'buyruq-tatil': doc([
    center('BUYRUQ'),
    sign('{{buyruq_sanasi}} yil', '№ {{buyruq_raqami}}'),
    center("Mehnat ta'tili berish to'g'risida"),
    p('BUYURAMAN:', { bold: true, align: AlignmentType.LEFT }),
    p("1. {{filial}} {{lavozim}}i {{xodim_fish}}ga uning {{ish_yili_boshi}} dan {{ish_yili_oxiri}} gacha bo'lgan ish davri uchun {{asosiy_kun}} kalendar kun asosiy va {{qoshimcha_kun}} kalendar kun qo'shimcha, jami {{jami_kun}} kalendar kun mehnat ta'tili {{boshlanish_yili}}-yil {{boshlanish_sanasi}}dan berilsin.", { indent: true }),
    p("2. Xodimning ta'tildan ishga chiqish sanasi {{chiqish_yili}}-yil {{ishga_chiqish_sanasi}} deb belgilansin.", { indent: true }),
    p('3. Buxgalteriya bo\'limi tegishli to\'lovlarni amalga oshirsin.', { indent: true }),
    p("{{#moddiy_yordam}}4. Xodimga ta'til uchun moddiy yordam sifatida bir oylik ish haqi miqdorida qo'shimcha to'lov to'lansin.{{/moddiy_yordam}}", { indent: true }),
    p("Asos: {{xodim_fish}}ning arizasi va O'zR Mehnat kodeksining 216, 217, 221-moddalari.", { indent: true }),
    p('', { after: 240 }),
    p('Bosh direktor: _________________ {{bosh_direktor_fish}}', { align: AlignmentType.LEFT }),
  ]),
};

async function main() {
  const dir = join(__dirname, '..', 'templates');
  mkdirSync(dir, { recursive: true });
  for (const [name, d] of Object.entries(templates)) {
    writeFileSync(join(dir, `${name}.docx`), await Packer.toBuffer(d));
    console.log('yaratildi:', name);
  }
}
main();
