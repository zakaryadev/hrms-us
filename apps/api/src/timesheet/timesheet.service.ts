import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import ExcelJS from 'exceljs';
import { CalendarService } from '../calendar/calendar.service';
import { CalendarOverrides, dayStatus, utcDate, ymd } from '../calendar/holidays';
import { PrismaService } from '../prisma/prisma.service';
import { PayrollResult, calcTimesheet, daysInMonth, validateDaysData } from '../payroll/payroll';

const MONTHS = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];

export interface TimesheetRow {
  employeeId: string;
  tabNumber: string;
  fullName: string;
  position: string;
  department: string;
  employmentType: 'shtat' | 'gpx';
  salary: number;
  daysData: Record<string, string>;
  result: PayrollResult;
}

export function parsePeriod(year: unknown, month: unknown) {
  const y = Number(year), m = Number(month);
  if (!Number.isInteger(y) || y < 2000 || y > 2100 || !Number.isInteger(m) || m < 1 || m > 12) {
    throw new BadRequestException('year ва month тўғри бўлиши керак (month 1..12)');
  }
  return { year: y, month: m };
}

@Injectable()
export class TimesheetService {
  constructor(private prisma: PrismaService, private calendar: CalendarService) {}

  private employees(departmentId?: string) {
    return this.prisma.employee.findMany({
      where: { status: { not: 'ishdan_boshagan' }, ...(departmentId && { departmentId }) },
      include: { position: true, department: true },
      orderBy: [{ position: { rankOrder: 'asc' } }, { lastName: 'asc' }],
    });
  }

  async list(year: number, month: number, departmentId?: string) {
    const emps = await this.employees(departmentId);
    const ov = await this.calendar.overrides(year);
    const sheets = await this.prisma.timesheet.findMany({ where: { year, month, employeeId: { in: emps.map((e) => e.id) } } });
    const byEmp = new Map(sheets.map((s) => [s.employeeId, s]));
    const rows: TimesheetRow[] = emps.map((e) => {
      const daysData = ((byEmp.get(e.id)?.daysData ?? {}) as Record<string, string>);
      const salary = Number(e.salary);
      return {
        employeeId: e.id, tabNumber: e.tabNumber, fullName: [e.lastName, e.firstName, e.middleName].filter(Boolean).join(' '),
        position: e.position.title, department: e.department.name, employmentType: e.employmentType, salary, daysData,
        result: calcTimesheet({ employmentType: e.employmentType, salary, year, month, daysData, overrides: ov }),
      };
    });
    return { year, month, daysInMonth: daysInMonth(year, month), holidaysWarning: !(await this.calendar.isYearConfigured(year)), days: this.dayInfo(year, month, ov), rows };
  }

  /** Har bir kun uchun: hafta kuni va dam olish/bayram belgisi (UI bo'yash uchun) */
  dayInfo(year: number, month: number, ov: CalendarOverrides) {
    return Array.from({ length: daysInMonth(year, month) }, (_, i) => {
      const d = utcDate(`${year}-${String(month).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`);
      const status = dayStatus(d, ov);
      return { day: i + 1, weekday: d.getUTCDay(), off: status !== 'work', status };
    });
  }

  async save(employeeId: string, year: number, month: number, rawDays: unknown) {
    const emp = await this.prisma.employee.findUnique({ where: { id: employeeId } });
    if (!emp) throw new NotFoundException('Ходим топилмади');
    let daysData: Record<string, string>;
    try { daysData = validateDaysData(year, month, rawDays); } catch (e) { throw new BadRequestException((e as Error).message); }
    return this.persist(emp, year, month, daysData, await this.calendar.overrides(year));
  }

  private async persist(emp: { id: string; employmentType: 'shtat' | 'gpx'; salary: Prisma.Decimal }, year: number, month: number, daysData: Record<string, string>, ov: CalendarOverrides) {
    const result = calcTimesheet({ employmentType: emp.employmentType, salary: Number(emp.salary), year, month, daysData, overrides: ov });
    await this.prisma.timesheet.upsert({
      where: { employeeId_year_month: { employeeId: emp.id, year, month } },
      update: { daysData, totalWorkedDays: result.workedDays, totalWorkedHours: result.totalHours, calculatedSalary: result.salary },
      create: { employeeId: emp.id, year, month, daysData, totalWorkedDays: result.workedDays, totalWorkedHours: result.totalHours, calculatedSalary: result.salary },
    });
    return { employeeId: emp.id, daysData, result };
  }

  /**
   * Таътил буйруғи яратилганда: таътил оралиғидаги ИШ кунларига «MT» қўяди (ойлар бўйича).
   * Бўш катак ва «8»/«7.2» алмаштирилади; KV, BPT, TSH, SK, TK каби аниқ белгилар сақланади.
   */
  async applyLeave(employeeId: string, startIso: string, endIso: string) {
    const emp = await this.prisma.employee.findUnique({ where: { id: employeeId } });
    if (!emp) throw new NotFoundException('Ходим топилмади');
    const start = utcDate(startIso), end = utcDate(endIso);
    const ov = await this.calendar.overrides(start.getUTCFullYear(), end.getUTCFullYear());
    const REPLACEABLE = new Set(['', '8', '7.2']);
    const byMonth = new Map<string, { year: number; month: number; days: number[] }>();
    for (let d = start; d <= end; d = new Date(d.getTime() + 86_400_000)) {
      if (dayStatus(d, ov) !== 'work') continue;
      const y = d.getUTCFullYear(), m = d.getUTCMonth() + 1, key = `${y}-${m}`;
      if (!byMonth.has(key)) byMonth.set(key, { year: y, month: m, days: [] });
      byMonth.get(key)!.days.push(d.getUTCDate());
    }
    let marked = 0;
    for (const { year, month, days } of byMonth.values()) {
      const existing = await this.prisma.timesheet.findUnique({ where: { employeeId_year_month: { employeeId, year, month } } });
      const data = { ...((existing?.daysData ?? {}) as Record<string, string>) };
      for (const day of days) {
        if (REPLACEABLE.has(data[String(day)] ?? '')) { data[String(day)] = 'MT'; marked++; }
      }
      await this.persist(emp, year, month, data, ov);
    }
    return { marked };
  }

  /** Таътил буйруғи ўчирилганда/ўзгартирилганда: оралиқдаги «MT» ни «8» га қайтаради (қолган белгилар сақланади). */
  async clearLeave(employeeId: string, startIso: string, endIso: string) {
    const emp = await this.prisma.employee.findUnique({ where: { id: employeeId } });
    if (!emp) return { cleared: 0 };
    const start = utcDate(startIso), end = utcDate(endIso);
    const ov = await this.calendar.overrides(start.getUTCFullYear(), end.getUTCFullYear());
    const byMonth = new Map<string, { year: number; month: number; days: number[] }>();
    for (let d = start; d <= end; d = new Date(d.getTime() + 86_400_000)) {
      const y = d.getUTCFullYear(), m = d.getUTCMonth() + 1, key = `${y}-${m}`;
      if (!byMonth.has(key)) byMonth.set(key, { year: y, month: m, days: [] });
      byMonth.get(key)!.days.push(d.getUTCDate());
    }
    let cleared = 0;
    for (const { year, month, days } of byMonth.values()) {
      const existing = await this.prisma.timesheet.findUnique({ where: { employeeId_year_month: { employeeId, year, month } } });
      if (!existing) continue;
      const data = { ...((existing.daysData ?? {}) as Record<string, string>) };
      for (const day of days) if (data[String(day)] === 'MT') { data[String(day)] = '8'; cleared++; }
      await this.persist(emp, year, month, data, ov);
    }
    return { cleared };
  }

  /** Ish kunlariga '8' qo'yadi; mavjud kodlarni, ishga qabuldan oldingi kunlarni va dam olish kunlarini tegmaydi. */
  async autofill(year: number, month: number, departmentId?: string) {
    const emps = await this.employees(departmentId);
    const existing = await this.prisma.timesheet.findMany({ where: { year, month, employeeId: { in: emps.map((e) => e.id) } } });
    const byEmp = new Map(existing.map((s) => [s.employeeId, (s.daysData ?? {}) as Record<string, string>]));
    const ov = await this.calendar.overrides(year);
    const info = this.dayInfo(year, month, ov);
    let updated = 0;
    for (const e of emps) {
      const data = { ...(byEmp.get(e.id) ?? {}) };
      const hire = e.hireDate ? ymd(e.hireDate) : null;
      let changed = false;
      for (const d of info) {
        if (d.off || data[String(d.day)]) continue;
        const iso = `${year}-${String(month).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`;
        if (hire && iso < hire) continue;
        data[String(d.day)] = '8';
        changed = true;
      }
      if (changed || !byEmp.has(e.id)) { await this.persist(e, year, month, data, ov); updated++; }
    }
    return { updated };
  }

  async exportXlsx(year: number, month: number, departmentId?: string): Promise<Buffer> {
    const t = await this.list(year, month, departmentId);
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet(`${MONTHS[month - 1]} ${year}`, { views: [{ state: 'frozen', xSplit: 3, ySplit: 3 }] });
    const n = t.daysInMonth;
    const lastCol = 3 + n + 3;

    ws.mergeCells(1, 1, 1, lastCol);
    ws.getCell(1, 1).value = `Иш вақтини ҳисобга олиш табели — ${MONTHS[month - 1]} ${year}`;
    ws.getCell(1, 1).font = { bold: true, size: 14 };
    ws.getCell(1, 1).alignment = { horizontal: 'center' };

    const header = ['Табель №', 'Ф.И.Ш.', 'Лавозим', ...t.days.map((d) => d.day), 'Иш кунлари', 'Соат', 'Ҳисобланган ойлик'];
    ws.getRow(3).values = header;
    ws.getRow(2).values = ['', '', '', ...t.days.map((d) => ['Як', 'Ду', 'Се', 'Чо', 'Па', 'Жу', 'Ша'][d.weekday])];
    for (const r of [2, 3]) {
      ws.getRow(r).font = { bold: true };
      ws.getRow(r).alignment = { horizontal: 'center', vertical: 'middle' };
      ws.getRow(r).eachCell((c) => { c.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } }; });
    }
    const fill = (argb: string): ExcelJS.Fill => ({ type: 'pattern', pattern: 'solid', fgColor: { argb } });
    t.days.forEach((d, i) => { if (d.off) { ws.getCell(2, 4 + i).fill = fill('FFE2E8F0'); ws.getCell(3, 4 + i).fill = fill('FFE2E8F0'); } });

    t.rows.forEach((r, idx) => {
      const row = ws.getRow(4 + idx);
      row.values = [r.tabNumber, r.fullName, r.position, ...t.days.map((d) => r.daysData[String(d.day)] ?? ''), r.result.workedDays, r.result.totalHours, r.result.salary];
      row.eachCell((c, col) => {
        c.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
        if (col > 3 && col <= 3 + n) {
          c.alignment = { horizontal: 'center' };
          if (t.days[col - 4].off) c.fill = fill('FFE2E8F0');
          const v = String(c.value ?? '');
          if (v && !['8', '7.2'].includes(v)) c.fill = fill(v === 'KV' ? 'FFFEF3C7' : v === 'SK' ? 'FFFECACA' : v === 'MT' ? 'FFDBEAFE' : 'FFE9D5FF');
        }
      });
      row.getCell(lastCol).numFmt = '#,##0';
    });
    ws.getColumn(1).width = 9; ws.getColumn(2).width = 34; ws.getColumn(3).width = 28;
    for (let i = 0; i < n; i++) ws.getColumn(4 + i).width = 4.5;
    ws.getColumn(lastCol - 2).width = 11; ws.getColumn(lastCol - 1).width = 8; ws.getColumn(lastCol).width = 18;

    const legend = 5 + t.rows.length;
    ws.getCell(legend, 2).value = 'Кодлар: 8 / 7.2 — ишланган; MT — меҳнат таътили; KV — касаллик варақаси; BPT — бола парвариши; SK — сабабсиз келмаган; TSH — ўз ҳисобидан таътил; TK — тушунтириш хати';
    ws.getCell(legend, 2).font = { italic: true, size: 9 };
    return Buffer.from(await wb.xlsx.writeBuffer());
  }
}
