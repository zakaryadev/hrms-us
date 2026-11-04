import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { mkdirSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';
import { workYear, calcLeave } from '../calendar/leave';
import { PrismaService } from '../prisma/prisma.service';
import { CalendarService } from '../calendar/calendar.service';
import { SettingsService } from '../settings/settings.service';
import { TimesheetService } from '../timesheet/timesheet.service';
import { DocxService } from './docx.service';
import { dayOf, fmtDate, fmtDayMonth, fmtMoney, fmtYear, monthName, toLang } from './format';
import { DOC_STRINGS } from './strings';

export const DOC_TYPES = ['obyektivka', 'ariza', 'kelishuv', 'buyruq-otkazish', 'buyruq-tatil'] as const;
export type DocType = (typeof DOC_TYPES)[number];
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

  private static names(dept: { name: string; parent: { name: string } | null }) {
    return { filial: dept.parent?.name ?? dept.name, bolim: dept.parent ? dept.name : '' };
  }
  private static fio = (e: { lastName: string; firstName: string; middleName: string | null }) =>
    [e.lastName, e.firstName, e.middleName].filter(Boolean).join(' ');

  async generate(type: DocType, employeeId: string, params: Params = {}, persist = true) {
    const lang = toLang(params.lang);
    const L = DOC_STRINGS[lang];
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
    let order: { type: 'lavozim_otkazish' | 'tatil_berish'; number: string; date: string } | null = null;

    switch (type) {
      case 'obyektivka': {
        const edu = e.education[e.education.length - 1];
        const history = e.workHistory.map((w) => ({
          davr: `${w.startDate ? fmtDate(w.startDate).slice(3) : '—'} — ${w.endDate ? fmtDate(w.endDate).slice(3) : L.present}`,
          lavozim_va_joy: [w.positionTitle, w.organizationName].filter(Boolean).join(', '),
        }));
        if (e.hireDate) {
          history.push({ davr: `${fmtDate(e.hireDate).slice(3)} — ${L.present}`, lavozim_va_joy: `${e.position.title}, ${s.tashkilot_nomi}, ${e.department.name}` });
        }
        data = {
          ...base,
          tugilgan_sana: fmtDate(e.birthDate), tugilgan_joy: e.birthPlace ?? '', millati: e.nationality ?? '',
          partiyaviyligi: e.partyMembership || L.none, malumoti: params.malumoti ?? '',
          tamomlagan_oliygoh: edu?.institutionName ?? '', mutaxassisligi: edu?.speciality ?? '',
          harbiy_unvoni: params.harbiyUnvoni || L.none, ishga_tushgan_sana: fmtDate(e.hireDate),
          ish_joylari: history,
          qarindoshlar: e.relatives.map((r) => ({
            qarindoshligi: r.relativeType, fish: r.fullName, tugilgan_yil_joy: r.birthYearPlace ?? '',
            ish_joyi: r.workPlacePosition ?? '', manzili: r.livingAddress ?? '',
          })),
        };
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
        const prev = await this.prisma.generatedDocument.count({ where: { employeeId, type: 'kelishuv' } });
        number = String(params.agreementNumber || prev + 1);
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
        number = String(params.orderNumber || `${L.orderPrefix}${(await this.prisma.order.count()) + 1}`);
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
        number = String(params.orderNumber || `${L.leavePrefix}${(await this.prisma.order.count()) + 1}`);
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
      default:
        throw new BadRequestException(`Номаълум ҳужжат тури: ${type}`);
    }

    const buffer = this.docx.render(lang, type, data);
    if (!persist) {
      return { buffer, fileName: `${type}-${e.tabNumber}${number ? '-' + number.replace(/[^\w-]/g, '_') : ''}.docx` };
    }
    mkdirSync(GENERATED_DIR, { recursive: true });
    const fileName = `${randomUUID()}.docx`;
    writeFileSync(join(GENERATED_DIR, fileName), buffer);

    const doc = await this.prisma.$transaction(async (tx) => {
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
      return created;
    });
    // Таътил буйруғи сақланганда табелга MT автоматик қўйилади
    if (type === 'buyruq-tatil' && params.calculated) {
      await this.timesheet.applyLeave(employeeId, params.startDate, params.calculated.endDate);
    }
    return { id: doc.id, type, number, downloadUrl: `/api/documents/generated/${doc.id}/download` };
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

  async orderFile(id: string) {
    const o = await this.prisma.order.findUnique({ where: { id }, include: { employee: true } });
    if (!o?.docxFilePath) throw new NotFoundException();
    return { path: join(GENERATED_DIR, o.docxFilePath), name: `buyruq-${o.orderNumber.replace(/[^\w-]/g, '_')}-${o.employee.tabNumber}.docx` };
  }

  listForEmployee(employeeId: string) {
    return this.prisma.generatedDocument.findMany({ where: { employeeId }, orderBy: { createdAt: 'desc' } });
  }

  async file(id: string) {
    const d = await this.prisma.generatedDocument.findUnique({ where: { id }, include: { employee: true } });
    if (!d) throw new NotFoundException();
    return { path: join(GENERATED_DIR, d.filePath), name: `${d.type}-${d.employee.tabNumber}${d.number ? '-' + d.number.replace(/[^\w-]/g, '_') : ''}.docx` };
  }
}
