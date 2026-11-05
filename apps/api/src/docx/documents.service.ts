import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'fs';
import { basename, join, resolve } from 'path';
import { workYear, calcLeave } from '../calendar/leave';
import { UPLOAD_DIR } from '../documents/documents.controller';
import { PrismaService } from '../prisma/prisma.service';
import { CalendarService } from '../calendar/calendar.service';
import { SettingsService } from '../settings/settings.service';
import { TimesheetService } from '../timesheet/timesheet.service';
import ExcelJS from 'exceljs';
import { DocxService } from './docx.service';
import { docFileName } from './filename';
import { baseLang, dayOf, fmtDate, fmtDayMonth, fmtMoney, fmtYear, monthName, toLang } from './format';
import { DOC_STRINGS } from './strings';

export const DOC_TYPES = ['obyektivka', 'ariza', 'kelishuv', 'buyruq-otkazish', 'buyruq-tatil', 'buyruq-qabul', 'buyruq-bosh', 'buyruq-rag'] as const;
export type DocType = (typeof DOC_TYPES)[number];
type OrderKind = 'ishga_qabul' | 'lavozim_otkazish' | 'tatil_berish' | 'ishdan_boshatish' | 'ragbatlantirish';
export const GENERATED_DIR = resolve(process.env.GENERATED_DIR ?? join(process.cwd(), 'generated'));

type Params = Record<string, any>;

function need(params: Params, ...keys: string[]) {
  const missing = keys.filter((k) => params[k] === undefined || params[k] === null || params[k] === '');
  if (missing.length) throw new BadRequestException(`Мажбурий майдонлар тўлдирилмаган: ${missing.join(', ')}`);
}
const ISO = /^\d{4}-\d{2}-\d{2}$/;
function needDates(params: Params, ...keys: string[]) {
  for (const k of keys) if (!ISO.test(String(params[k] ?? ''))) throw new BadRequestException(`«${k}» санаси ЙЙЙЙ-ОО-КК форматида бўлиши керак`);
}

@Injectable()
export class DocumentsService {
  constructor(private prisma: PrismaService, private docx: DocxService, private settings: SettingsService, private calendar: CalendarService, private timesheet: TimesheetService) {}

  private async employee(id: string) {
    const e = await this.prisma.employee.findUnique({
      where: { id },
      include: {
        department: { include: { parent: true } }, position: true,
        education: true, workHistory: { orderBy: { startDate: 'asc' } }, relatives: true,
      },
    });
    if (!e) throw new NotFoundException('Ходим топилмади');
    return e;
  }

  private async target(params: Params) {
    need(params, 'newDepartmentId', 'newPositionId');
    const dept = await this.prisma.department.findUnique({ where: { id: params.newDepartmentId }, include: { parent: true } });
    const pos = await this.prisma.position.findUnique({ where: { id: params.newPositionId } });
    if (!dept || !pos) throw new BadRequestException('Янги бўлим ёки лавозим топилмади');
    return { dept, pos };
  }

  /** Бўлим номида ташкилот номи аллақачон бор бўлса (масалан «“X” МЧЖ Қорақалпоғистон филиали»), уни яна такрорламаймиз */
  private static orgInside(org: string, ...units: string[]) {
    const norm = (x: string) => x.toLowerCase().replace(/[“”«»"'ʻʼ`.,]/g, '').replace(/\s+/g, ' ').trim();
    const o = norm(org);
    if (!o) return false;
    const brand = /[“"«]([^”"»]+)[”"»]/.exec(org)?.[1];
    const b = brand ? norm(brand) : '';
    return units.some((u) => { const n = norm(u ?? ''); return !!n && (n.includes(o) || (!!b && n.includes(b))); });
  }

  private static names(dept: { name: string; parent: { name: string } | null }) {
    return { filial: dept.parent?.name ?? dept.name, bolim: dept.parent ? dept.name : '' };
  }
  private static fio = (e: { lastName: string; firstName: string; middleName: string | null }) =>
    [e.lastName, e.firstName, e.middleName].filter(Boolean).join(' ');

  /** Бир вақтда рақам бериш/сақлаш тартибга солинади (дубликат буйруқ рақамларининг олдини олади). Битта API нусхаси учун. */
  private chain: Promise<unknown> = Promise.resolve();
  private locked<T>(fn: () => Promise<T>): Promise<T> {
    const run = this.chain.then(fn, fn);
    this.chain = run.catch(() => undefined);
    return run;
  }

  /** Йил ичида префикс бўйича кейинги рақам: энг катта мавжуд рақам + 1 (ўчирилган буйруқлардан кейин ҳам такрорланмайди). */
  private async nextNumber(prefix: string, dateIso: string) {
    const year = Number(dateIso.slice(0, 4));
    const rows = await this.prisma.order.findMany({
      where: { orderNumber: { startsWith: prefix }, orderDate: { gte: new Date(`${year}-01-01`), lt: new Date(`${year + 1}-01-01`) } },
      select: { orderNumber: true },
    });
    const max = rows.reduce((m, r) => Math.max(m, parseInt(r.orderNumber.slice(prefix.length), 10) || 0), 0);
    return `${prefix}${max + 1}`;
  }

  private async orderNumber(prefix: string, manual: unknown, dateIso: string, persist: boolean, selfFile?: string) {
    const typed = String(manual ?? '').trim();
    if (!typed) return this.nextNumber(prefix, dateIso);
    if (persist) {
      const year = Number(dateIso.slice(0, 4));
      const dup = await this.prisma.order.findFirst({
        where: {
          orderNumber: typed, orderDate: { gte: new Date(`${year}-01-01`), lt: new Date(`${year + 1}-01-01`) },
          ...(selfFile ? { NOT: { docxFilePath: selfFile } } : {}),
        },
      });
      if (dup) throw new ConflictException(`Буйруқ рақами «${typed}» ${year} йилда аллақачон мавжуд`);
    }
    return typed;
  }

  private async build(type: DocType, employeeId: string, params: Params, persist: boolean, selfFile?: string) {
    const lang = toLang(params.lang);
    const L = DOC_STRINGS[baseLang(lang)];   // матнлар кирилл ёки лотинда; янги алифбо — охирида бутун ҳужжат ўгирилади
    const e = await this.employee(employeeId);
    const s = await this.settings.getAll();
    const cur = DocumentsService.names(e.department);
    const fish = DocumentsService.fio(e);
    const base = {
      tashkilot_nomi: s.tashkilot_nomi, rahbar_fish: s.bosh_direktor_fish, bosh_direktor_fish: s.bosh_direktor_fish,
      shahar: s.shahar, vakil_fish: s.vakil_fish, ishonchnoma_matni: s.ishonchnoma_matni,
      ish_beruvchi_rekvizitlari: s.ish_beruvchi_rekvizitlari,
      imzolovchi: params.signer || L.signer,
      xodim_fish: fish, amaldagi_filial: cur.filial, amaldagi_bolim: cur.bolim, amaldagi_lavozim: e.position.title,
    };
    let data: Record<string, unknown>;
    let number: string | null = null;
    let photo: Buffer | undefined;
    let order: { type: OrderKind; number: string; date: string } | null = null;

    switch (type) {
      case 'obyektivka': {
        // Т-2 га энг сўнгги тамомланган таълим (битирган йил бўйича; йил йўқ бўлса — охирги қатор)
        const edu = [...e.education].sort((x, y) => (x.endYear ?? 0) - (y.endYear ?? 0)).at(-1);
        const yy = L.year; // «й.» / «y.»
        const period = (start: Date | null, end: Date | null) => {
          const a = start ? start.getUTCFullYear() : null, b = end ? end.getUTCFullYear() : null;
          if (!a) return '—';
          if (!end) return `${a} ${yy} - ${L.present}`;
          return a === b ? `${a} ${yy}` : `${a}-${b} ${L.years}`;
        };
        const history = e.workHistory.map((w) => ({
          davr: period(w.startDate, w.endDate),
          joy: [w.organizationName, w.positionTitle].filter(Boolean).join(' - '),
        }));
        const place = (e.birthPlace ?? '').trim();
        const comma = place.indexOf(',');
        const [place1, place2] = comma < 0 ? [place, ''] : [place.slice(0, comma + 1), place.slice(comma + 1).trim()];
        const hire = e.hireDate;
        const orgDup = DocumentsService.orgInside(s.tashkilot_nomi, cur.filial, cur.bolim);
        const workplace = [orgDup ? '' : s.tashkilot_nomi, cur.filial, cur.bolim, e.position.title].filter(Boolean).join(' ');
        if (hire) history.push({ davr: period(hire, null), joy: workplace });
        data = {
          ...base, tashkilot_nomi: orgDup ? '' : base.tashkilot_nomi, ish_joyi_matn: workplace,
          ishga_kirish_matn: hire ? L.hireLine(hire.getUTCFullYear(), String(hire.getUTCDate()).padStart(2, '0'), monthName(hire, lang)) : '',
          tugilgan_sana: fmtDate(e.birthDate), tugilgan_joy_1: place1, tugilgan_joy_2: place2,
          millati: e.nationality ?? '', partiyaviyligi: e.partyMembership || L.none, malumoti: params.malumoti || e.educationLevel || '',
          tamomlagan: edu ? [[edu.endYear ? `${edu.endYear} ${yy}` : '', edu.institutionName].filter(Boolean).join(' '), edu.studyType ? `(${edu.studyType})` : ''].filter(Boolean).join(' ') : '',
          mutaxassisligi: edu?.speciality ?? '',
          // Ходим профилидаги қиймат; параметр (қўлда) берилса — шу устун; иккаласи ҳам бўш бўлса «йўқ»
          ilmiy_daraja: params.ilmiyDaraja || e.academicDegree || L.none, ilmiy_unvon: params.ilmiyUnvon || e.academicTitle || L.none,
          chet_tillari: params.chetTillari || e.foreignLanguages || L.none, harbiy_unvoni: params.harbiyUnvoni || e.militaryRank || L.none,
          mukofotlar: params.mukofotlar || e.stateAwards || L.none, deputatlik: params.deputatlik || e.deputyStatus || L.none,
          ish_joylari: history,
          qarindoshlar: e.relatives.map((r) => ({
            qarindoshligi: r.relativeType, fish: r.fullName, tugilgan_yil_joy: r.birthYearPlace ?? '',
            ish_joyi: r.workPlacePosition ?? '', manzili: r.livingAddress ?? '',
          })),
        };
        if (e.photoUrl) {
          try { photo = readFileSync(join(UPLOAD_DIR, basename(e.photoUrl))); } catch { /* расм файли йўқ — шаблондаги рамка қолади */ }
        }
        break;
      }
      case 'ariza': {
        need(params, 'transferDate', 'applicationDate'); needDates(params, 'transferDate', 'applicationDate');
        const t = await this.target(params);
        const tn = DocumentsService.names(t.dept);
        data = {
          ...base, yangi_filial: [tn.filial, tn.bolim].filter(Boolean).join(' '), yangi_lavozim: t.pos.title,
          otkazish_yili: fmtYear(params.transferDate), otkazish_kuni: dayOf(params.transferDate),
          otkazish_oyi: monthName(params.transferDate, lang), ariza_sanasi: fmtDate(params.applicationDate),
        };
        break;
      }
      case 'kelishuv': {
        need(params, 'transferDate', 'agreementDate', 'newSalary'); needDates(params, 'transferDate', 'agreementDate');
        if (!e.contractNumber || !e.contractDate) throw new BadRequestException('Ходимда меҳнат шартномаси рақами ва санаси киритилмаган');
        const t = await this.target(params);
        const tn = DocumentsService.names(t.dept);
        const prevDocs = await this.prisma.generatedDocument.findMany({ where: { employeeId, type: 'kelishuv', ...(selfFile ? { NOT: { filePath: selfFile } } : {}) }, select: { number: true } });
        number = String(params.agreementNumber || prevDocs.reduce((m, d) => Math.max(m, parseInt(d.number ?? '', 10) || 0), 0) + 1);
        data = {
          ...base, ishonchnoma_matni: params.poaText || s.ishonchnoma_matni,
          shartnoma_sanasi: fmtDate(e.contractDate), shartnoma_raqami: e.contractNumber.replace(/^\D+\s*/, ''),
          kelishuv_raqami: number, kelishuv_sanasi: fmtDate(params.agreementDate),
          yangi_filial: [tn.filial, tn.bolim].filter(Boolean).join(' '), yangi_lavozim: t.pos.title,
          otkazish_yili: fmtYear(params.transferDate), otkazish_sanasi: fmtDayMonth(params.transferDate, lang),
          oylik_maosh: fmtMoney(params.newSalary),
          xodim_pasport: e.passportSeriesNumber ?? '', xodim_pinfl: e.pinfl ?? '', xodim_manzil: e.addressResidential ?? '',
        };
        break;
      }
      case 'buyruq-otkazish': {
        need(params, 'orderDate', 'transferDate', 'basis'); needDates(params, 'orderDate', 'transferDate');
        const t = await this.target(params);
        const tn = DocumentsService.names(t.dept);
        number = await this.orderNumber(L.orderPrefix, params.orderNumber, params.orderDate, persist, selfFile);
        order = { type: 'lavozim_otkazish', number, date: params.orderDate };
        data = {
          ...base, buyruq_raqami: number, buyruq_sanasi: fmtDate(params.orderDate),
          yangi_filial: [tn.filial, tn.bolim].filter(Boolean).join(' '), yangi_lavozim: t.pos.title,
          otkazish_yili: fmtYear(params.transferDate), otkazish_sanasi: fmtDayMonth(params.transferDate, lang),
          asos_matni: String(params.basis).replace(/[.\s]+$/, ''),
        };
        break;
      }
      case 'buyruq-tatil': {
        need(params, 'orderDate', 'startDate'); needDates(params, 'orderDate', 'startDate');
        if (!e.hireDate) throw new BadRequestException('Ходимнинг ишга қабул санаси киритилмаган');
        const basic = Number(params.basicDays ?? e.annualLeaveBasicDays);
        const extra = Number(params.extraDays ?? e.annualLeaveExtraDays);
        const leave = calcLeave(params.startDate, basic + extra, await this.calendar.overridesAround(params.startDate));
        const auto = workYear(e.hireDate.toISOString().slice(0, 10), params.startDate);
        const wy = {
          start: ISO.test(String(params.workYearStart ?? '')) ? params.workYearStart : auto.start,
          end: ISO.test(String(params.workYearEnd ?? '')) ? params.workYearEnd : auto.end,
        };
        number = await this.orderNumber(L.leavePrefix, params.orderNumber, params.orderDate, persist, selfFile);
        order = { type: 'tatil_berish', number, date: params.orderDate };
        data = {
          ...base, filial: cur.filial, lavozim: e.position.title,
          buyruq_raqami: number, buyruq_sanasi: fmtDate(params.orderDate),
          ish_yili_boshi: fmtDate(wy.start), ish_yili_oxiri: fmtDate(wy.end),
          asosiy_kun: basic, qoshimcha_kun: extra, jami_kun: basic + extra,
          boshlanish_yili: fmtYear(params.startDate), boshlanish_sanasi: fmtDayMonth(params.startDate, lang),
          chiqish_yili: fmtYear(leave.returnDate), ishga_chiqish_sanasi: fmtDayMonth(leave.returnDate, lang),
          moddiy_yordam: !!params.materialAid,
          asos_matni: String(params.basis || L.basisLeave(fish)).replace(/[.\s]+$/, ''),
        };
        params = { ...params, calculated: leave };
        break;
      }
      case 'buyruq-qabul': {
        const hireDate = params.hireDate || (e.hireDate ? e.hireDate.toISOString().slice(0, 10) : '');
        need({ ...params, hireDate }, 'orderDate', 'hireDate'); needDates({ ...params, hireDate }, 'orderDate', 'hireDate');
        number = await this.orderNumber(L.hirePrefix, params.orderNumber, params.orderDate, persist, selfFile);
        order = { type: 'ishga_qabul', number, date: params.orderDate };
        const probation = Number(params.probationMonths ?? e.probationMonths) || 0;
        data = {
          ...base, buyruq_raqami: number, buyruq_sanasi: fmtDate(params.orderDate),
          qabul_yili: fmtYear(hireDate), qabul_sanasi: fmtDayMonth(hireDate, lang),
          oylik_maosh: fmtMoney(params.salary ?? e.salary),
          sinov: probation > 0, sinov_muddati: probation,
          asos_matni: String(params.basis || L.basisHire(fish)).replace(/[.\s]+$/, ''),
        };
        params = { ...params, hireDate };
        break;
      }
      case 'buyruq-bosh': {
        need(params, 'orderDate', 'dismissalDate', 'basis'); needDates(params, 'orderDate', 'dismissalDate');
        if (!selfFile && e.status === 'ishdan_boshagan') throw new BadRequestException('Ходим аллақачон ишдан бўшатилган (архивда)');
        number = await this.orderNumber(L.firePrefix, params.orderNumber, params.orderDate, persist, selfFile);
        order = { type: 'ishdan_boshatish', number, date: params.orderDate };
        data = {
          ...base, buyruq_raqami: number, buyruq_sanasi: fmtDate(params.orderDate),
          ketish_yili: fmtYear(params.dismissalDate), ketish_sanasi: fmtDayMonth(params.dismissalDate, lang),
          kompensatsiya: !!params.compensation,
          asos_matni: String(params.basis).replace(/[.\s]+$/, ''),
        };
        break;
      }
      case 'buyruq-rag': {
        need(params, 'orderDate', 'reason', 'basis'); needDates(params, 'orderDate');
        const amount = Number(params.amount) || 0;
        const rewardText = String(params.rewardText ?? '').trim().replace(/[.\s]+$/, '');
        if (!rewardText && !amount) throw new BadRequestException('Рағбатлантириш тури ёки пул мукофоти суммаси киритилмаган');
        number = await this.orderNumber(L.rewardPrefix, params.orderNumber, params.orderDate, persist, selfFile);
        order = { type: 'ragbatlantirish', number, date: params.orderDate };
        data = {
          ...base, buyruq_raqami: number, buyruq_sanasi: fmtDate(params.orderDate),
          sabab_matni: String(params.reason).replace(/[.\s]+$/, ''),
          mukofot_matni: rewardText, summa_matni: amount ? L.awardMoney(fmtMoney(amount)) : '',
          asos_matni: String(params.basis).replace(/[.\s]+$/, ''),
        };
        break;
      }
      default:
        throw new BadRequestException(`Номаълум ҳужжат тури: ${type}`);
    }

    return { lang, data, number, order, params, e, fish, photo };
  }

  async generate(type: DocType, employeeId: string, params: Params = {}, persist = true) {
    return this.locked(async () => {
    const { lang, data, number, order, params: p, e, fish, photo } = await this.build(type, employeeId, params, persist);
    const who = `${TEMPLATE_LABEL[type] ?? type}${number ? ' № ' + number : ''}, ${fish} (${e.tabNumber})`;
    params = p;

    const buffer = this.docx.render(lang, type, data, { photo });
    if (!persist) {
      return { buffer, summary: `Ҳужжат юклаб олинди (сақланмади): ${who}`, fileName: docFileName(type, e, number) };
    }
    mkdirSync(GENERATED_DIR, { recursive: true });
    const fileName = `${randomUUID()}.docx`;
    writeFileSync(join(GENERATED_DIR, fileName), buffer);

    let doc;
    try {
      doc = await this.prisma.$transaction(async (tx) => {
        const created = await tx.generatedDocument.create({
          data: { type, employeeId, number, payload: params as Prisma.InputJsonValue, filePath: fileName },
        });
        if (order) {
          await tx.order.create({
            data: {
              orderNumber: order.number, orderDate: new Date(order.date), orderType: order.type,
              employeeId, payloadJson: params as Prisma.InputJsonValue, docxFilePath: fileName,
            },
          });
        }
        // Ишдан бўшатиш буйруғи сақланганда ходим автоматик архивга ўтади
        if (type === 'buyruq-bosh') await tx.employee.update({ where: { id: employeeId }, data: { status: 'ishdan_boshagan' } });
        return created;
      });
    } catch (err) { this.unlinkFile(fileName); throw err; }
    // Таътил буйруғи сақланганда табелга MT автоматик қўйилади
    if (type === 'buyruq-tatil' && params.calculated) {
      await this.timesheet.applyLeave(employeeId, params.startDate, params.calculated.endDate);
    }
    return { id: doc.id, type, number, summary: `Ҳужжат яратилди: ${who}`, downloadUrl: `/api/documents/generated/${doc.id}/download` };
    });
  }

  /** Яратилган ҳужжатни ўзгартирилган майдонлар билан қайта шакллантиради: файл, рақам ва боғлиқ буйруқ ёзуви янгиланади. */
  async update(id: string, newParams: Params = {}) {
    return this.locked(async () => {
      const d = await this.prisma.generatedDocument.findUnique({ where: { id }, include: { employee: true } });
      if (!d) throw new NotFoundException('Ҳужжат топилмади');
      const type = d.type as DocType;
      if (!DOC_TYPES.includes(type)) throw new BadRequestException('Бу ҳужжат турини таҳрирлаб бўлмайди');
      const old = (d.payload ?? {}) as Params;
      const { save: _s, calculated: _c, ...rest } = { ...old, ...newParams } as Params;
      // Рақам сақланади (қўлда ўзгартирилмаса)
      if (type === 'kelishuv') rest.agreementNumber = newParams.agreementNumber || d.number;
      else if (type.startsWith('buyruq-')) rest.orderNumber = newParams.orderNumber || d.number;
      const built = await this.build(type, d.employeeId, rest, true, d.filePath);
      const buffer = this.docx.render(built.lang, type, built.data, { photo: built.photo });
      mkdirSync(GENERATED_DIR, { recursive: true });
      writeFileSync(join(GENERATED_DIR, d.filePath), buffer);
      const params = built.params;
      await this.prisma.$transaction(async (tx) => {
        await tx.generatedDocument.update({ where: { id }, data: { number: built.number, payload: params as Prisma.InputJsonValue } });
        if (built.order) {
          await tx.order.updateMany({
            where: { docxFilePath: d.filePath },
            data: { orderNumber: built.order.number, orderDate: new Date(built.order.date), payloadJson: params as Prisma.InputJsonValue },
          });
        }
      });
      if (type === 'buyruq-tatil') {
        await this.releaseLeave(d.employeeId, old);
        if (params.calculated) await this.timesheet.applyLeave(d.employeeId, params.startDate, params.calculated.endDate);
      }
      return { id, type, number: built.number, summary: `Ҳужжат таҳрирланди: ${TEMPLATE_LABEL[type] ?? type}${built.number ? ' № ' + built.number : ''}, ${built.fish} (${built.e.tabNumber})`, downloadUrl: `/api/documents/generated/${id}/download` };
    });
  }

  /** Таътил буйруғи бекор бўлганда табелдаги «MT» ни қайтаради. */
  private async releaseLeave(employeeId: string, payload: Params) {
    const end = payload?.calculated?.endDate;
    if (payload?.startDate && end) await this.timesheet.clearLeave(employeeId, payload.startDate, end);
  }

  async listAll(type?: string) {
    const rows = await this.prisma.generatedDocument.findMany({
      where: type ? { type } : undefined, orderBy: { createdAt: 'desc' }, take: 300,
      include: { employee: { select: { id: true, tabNumber: true, firstName: true, lastName: true, middleName: true } } },
    });
    return rows.map(({ payload, filePath, ...r }) => r);
  }

  async listOrders(type?: string) {
    const rows = await this.prisma.order.findMany({
      where: type ? { orderType: type as any } : undefined, orderBy: [{ orderDate: 'desc' }, { createdAt: 'desc' }], take: 300,
      include: { employee: { select: { id: true, tabNumber: true, firstName: true, lastName: true, middleName: true } } },
    });
    return rows.map(({ docxFilePath, ...r }) => ({ ...r, hasFile: !!docxFilePath }));
  }

  async exportOrdersXlsx(type?: string): Promise<Buffer> {
    const rows = await this.prisma.order.findMany({
      where: type ? { orderType: type as any } : undefined, orderBy: [{ orderDate: 'desc' }, { createdAt: 'desc' }], take: 5000,
      include: { employee: { select: { tabNumber: true, firstName: true, lastName: true, middleName: true, department: { select: { name: true } }, position: { select: { title: true } } } } },
    });
    const L: Record<string, string> = { ishga_qabul: 'Ишга қабул', lavozim_otkazish: 'Лавозимга ўтказиш', tatil_berish: 'Меҳнат таътили', ishdan_boshatish: 'Ишдан бўшатиш', ragbatlantirish: 'Рағбатлантириш' };
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Буйруқлар', { views: [{ state: 'frozen', ySplit: 1 }] });
    ws.columns = [
      { header: '№', key: 'n', width: 12 }, { header: 'Сана', key: 'd', width: 12 }, { header: 'Тури', key: 't', width: 22 },
      { header: 'Табель №', key: 'tab', width: 10 }, { header: 'Ф.И.Ш.', key: 'f', width: 38 }, { header: 'Бўлим', key: 'dep', width: 28 }, { header: 'Лавозим', key: 'pos', width: 28 },
    ];
    ws.getRow(1).font = { bold: true };
    for (const o of rows) {
      ws.addRow({
        n: o.orderNumber, d: fmtDate(o.orderDate), t: L[o.orderType] ?? o.orderType, tab: o.employee.tabNumber,
        f: DocumentsService.fio(o.employee), dep: o.employee.department.name, pos: o.employee.position.title,
      });
    }
    return Buffer.from(await wb.xlsx.writeBuffer());
  }

  async orderFile(id: string) {
    const o = await this.prisma.order.findUnique({ where: { id }, include: { employee: { include: { department: true, position: true } } } });
    if (!o?.docxFilePath) throw new NotFoundException();
    const slug = { ishga_qabul: 'buyruq-qabul', lavozim_otkazish: 'buyruq-otkazish', tatil_berish: 'buyruq-tatil', ishdan_boshatish: 'buyruq-bosh', ragbatlantirish: 'buyruq-rag' }[o.orderType];
    return { path: join(GENERATED_DIR, o.docxFilePath), name: docFileName(slug, o.employee, o.orderNumber) };
  }

  listForEmployee(employeeId: string) {
    return this.prisma.generatedDocument.findMany({ where: { employeeId }, orderBy: { createdAt: 'desc' } });
  }

  async file(id: string) {
    const d = await this.prisma.generatedDocument.findUnique({ where: { id }, include: { employee: { include: { department: true, position: true } } } });
    if (!d) throw new NotFoundException();
    return { path: join(GENERATED_DIR, d.filePath), name: docFileName(d.type, d.employee, d.number) };
  }

  /** Яратилган ҳужжатни (ва шу файлга боғлиқ буйруқни) файли билан ўчиради. */
  async removeGenerated(id: string) {
    const d = await this.prisma.generatedDocument.findUnique({ where: { id }, include: { employee: true } });
    if (!d) throw new NotFoundException('Ҳужжат топилмади');
    await this.prisma.$transaction([
      this.prisma.order.deleteMany({ where: { docxFilePath: d.filePath } }),
      this.prisma.generatedDocument.delete({ where: { id } }),
    ]);
    this.unlinkFile(d.filePath);
    if (d.type === 'buyruq-tatil') await this.releaseLeave(d.employeeId, (d.payload ?? {}) as Params);
    return `Ҳужжат ўчирилди: ${TEMPLATE_LABEL[d.type] ?? d.type}${d.number ? ' № ' + d.number : ''}, ${DocumentsService.fio(d.employee)} (${d.employee.tabNumber})`;
  }

  /** Буйруқни (ва шу файлга боғлиқ ҳужжат ёзувини) файли билан ўчиради. */
  async removeOrder(id: string) {
    const o = await this.prisma.order.findUnique({ where: { id }, include: { employee: true } });
    if (!o) throw new NotFoundException('Буйруқ топилмади');
    const path = o.docxFilePath;
    await this.prisma.$transaction([
      this.prisma.order.delete({ where: { id } }),
      ...(path ? [this.prisma.generatedDocument.deleteMany({ where: { filePath: path } })] : []),
    ]);
    if (path) this.unlinkFile(path);
    if (o.orderType === 'tatil_berish') await this.releaseLeave(o.employeeId, (o.payloadJson ?? {}) as Params);
    return `Буйруқ ўчирилди: № ${o.orderNumber} (${o.orderType}), ${DocumentsService.fio(o.employee)} (${o.employee.tabNumber})`;
  }

  private unlinkFile(name: string) {
    const p = resolve(GENERATED_DIR, name);
    if (!p.startsWith(GENERATED_DIR) || !existsSync(p)) return;
    try { unlinkSync(p); } catch { /* файл йўқ ёки банд — ёзув барибир ўчирилган */ }
  }
}

export const TEMPLATE_LABEL: Record<string, string> = {
  obyektivka: 'Маълумотнома (Т-2)', ariza: 'Ўтказиш ҳақида ариза', kelishuv: 'Меҳнат шартномасига келишув',
  'buyruq-otkazish': 'Лавозимга ўтказиш буйруғи', 'buyruq-tatil': 'Меҳнат таътили буйруғи',
  'buyruq-qabul': 'Ишга қабул буйруғи', 'buyruq-bosh': 'Ишдан бўшатиш буйруғи', 'buyruq-rag': 'Рағбатлантириш буйруғи',
};
