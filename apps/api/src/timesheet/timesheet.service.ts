import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import ExcelJS from 'exceljs';
import { MOVABLE_HOLIDAYS, isWorkingDay, utcDate, ymd } from '../calendar/holidays';
import { PrismaService } from '../prisma/prisma.service';
import { PayrollResult, calcTimesheet, daysInMonth, validateDaysData } from '../payroll/payroll';

const MONTHS = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'];

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
    throw new BadRequestException("year va month to'g'ri bo'lishi kerak (month 1..12)");
  }
  return { year: y, month: m };
}

@Injectable()
export class TimesheetService {
  constructor(private prisma: PrismaService) {}

  private employees(departmentId?: string) {
    return this.prisma.employee.findMany({
      where: { status: { not: 'ishdan_boshagan' }, ...(departmentId && { departmentId }) },
      include: { position: true, department: true },
      orderBy: [{ position: { rankOrder: 'asc' } }, { lastName: 'asc' }],
    });
  }

  async list(year: number, month: number, departmentId?: string) {
    const emps = await this.employees(departmentId);
    const sheets = await this.prisma.timesheet.findMany({ where: { year, month, employeeId: { in: emps.map((e) => e.id) } } });
    const byEmp = new Map(sheets.map((s) => [s.employeeId, s]));
    const rows: TimesheetRow[] = emps.map((e) => {
      const daysData = ((byEmp.get(e.id)?.daysData ?? {}) as Record<string, string>);
      const salary = Number(e.salary);
      return {
        employeeId: e.id, tabNumber: e.tabNumber, fullName: [e.lastName, e.firstName, e.middleName].filter(Boolean).join(' '),
        position: e.position.title, department: e.department.name, employmentType: e.employmentType, salary, daysData,
        result: calcTimesheet({ employmentType: e.employmentType, salary, year, month, daysData }),
      };
    });
    return { year, month, daysInMonth: daysInMonth(year, month), holidaysWarning: !(year in MOVABLE_HOLIDAYS), days: this.dayInfo(year, month), rows };
  }

  /** Har bir kun uchun: hafta kuni va dam olish/bayram belgisi (UI bo'yash uchun) */
  dayInfo(year: number, month: number) {
    return Array.from({ length: daysInMonth(year, month) }, (_, i) => {
      const d = utcDate(`${year}-${String(month).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`);
      return { day: i + 1, weekday: d.getUTCDay(), off: !isWorkingDay(d) };
    });
  }

  async save(employeeId: string, year: number, month: number, rawDays: unknown) {
    const emp = await this.prisma.employee.findUnique({ where: { id: employeeId } });
    if (!emp) throw new NotFoundException('Xodim topilmadi');
    let daysData: Record<string, string>;
    try { daysData = validateDaysData(year, month, rawDays); } catch (e) { throw new BadRequestException((e as Error).message); }
    return this.persist(emp, year, month, daysData);
  }

  private async persist(emp: { id: string; employmentType: 'shtat' | 'gpx'; salary: Prisma.Decimal }, year: number, month: number, daysData: Record<string, string>) {
    const result = calcTimesheet({ employmentType: emp.employmentType, salary: Number(emp.salary), year, month, daysData });
    await this.prisma.timesheet.upsert({
      where: { employeeId_year_month: { employeeId: emp.id, year, month } },
      update: { daysData, totalWorkedDays: result.workedDays, totalWorkedHours: result.totalHours, calculatedSalary: result.salary },
      create: { employeeId: emp.id, year, month, daysData, totalWorkedDays: result.workedDays, totalWorkedHours: result.totalHours, calculatedSalary: result.salary },
    });
    return { employeeId: emp.id, daysData, result };
  }

  /** Ish kunlariga '8' qo'yadi; mavjud kodlarni, ishga qabuldan oldingi kunlarni va dam olish kunlarini tegmaydi. */
  async autofill(year: number, month: number, departmentId?: string) {
    const emps = await this.employees(departmentId);
    const existing = await this.prisma.timesheet.findMany({ where: { year, month, employeeId: { in: emps.map((e) => e.id) } } });
    const byEmp = new Map(existing.map((s) => [s.employeeId, (s.daysData ?? {}) as Record<string, string>]));
    const info = this.dayInfo(year, month);
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
      if (changed || !byEmp.has(e.id)) { await this.persist(e, year, month, data); updated++; }
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
    ws.getCell(1, 1).value = `Ish vaqtini hisobga olish tabeli — ${MONTHS[month - 1]} ${year}`;
    ws.getCell(1, 1).font = { bold: true, size: 14 };
    ws.getCell(1, 1).alignment = { horizontal: 'center' };

    const header = ['Tabel №', 'F.I.Sh.', 'Lavozim', ...t.days.map((d) => d.day), 'Ish kunlari', 'Soat', 'Hisoblangan oylik'];
    ws.getRow(3).values = header;
    ws.getRow(2).values = ['', '', '', ...t.days.map((d) => ['Ya', 'Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh'][d.weekday])];
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
    ws.getCell(legend, 2).value = "Kodlar: 8 / 7.2 — ishlangan; MT — mehnat ta'tili; KV — kasallik varaqasi; BPT — bola parvarishi; SK — sababsiz kelmagan; TSH — o'z hisobidan ta'til; TK — tushuntirish xati";
    ws.getCell(legend, 2).font = { italic: true, size: 9 };
    return Buffer.from(await wb.xlsx.writeBuffer());
  }
}
