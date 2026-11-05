import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import ExcelJS from 'exceljs';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEmployeeDto, ListEmployeesQuery, UpdateEmployeeDto } from './employees.dto';

const DATE_FIELDS = ['birthDate', 'passportGivenDate', 'hireDate', 'contractDate'] as const;

function toDate(v?: string | null) {
  return v ? new Date(v) : undefined;
}

@Injectable()
export class EmployeesService {
  constructor(private prisma: PrismaService) {}

  private scalarData(dto: UpdateEmployeeDto) {
    const { education, workHistory, relatives, ...rest } = dto;
    const data: Record<string, unknown> = { ...rest };
    for (const f of DATE_FIELDS) if (f in data) data[f] = toDate(data[f] as string);
    return data as Prisma.EmployeeUncheckedCreateInput;
  }

  private whereOf(q: ListEmployeesQuery): Prisma.EmployeeWhereInput {
    return {
      ...(q.departmentId && { departmentId: q.departmentId }),
      ...(q.status && { status: q.status as any }),
      ...(q.archived === 'true' && { status: 'ishdan_boshagan' as const }),
      ...(q.archived === 'false' && { status: { not: 'ishdan_boshagan' as const } }),
      ...(q.q && {
        OR: [
          { firstName: { contains: q.q, mode: 'insensitive' } },
          { lastName: { contains: q.q, mode: 'insensitive' } },
          { middleName: { contains: q.q, mode: 'insensitive' } },
          { tabNumber: { contains: q.q, mode: 'insensitive' } },
          { pinfl: { contains: q.q } },
        ],
      }),
    };
  }

  async list(q: ListEmployeesQuery) {
    const page = Math.max(q.page ?? 1, 1);
    const pageSize = Math.min(Math.max(q.pageSize ?? 20, 1), 200);
    const where = this.whereOf(q);
    const [items, total] = await this.prisma.$transaction([
      this.prisma.employee.findMany({
        where,
        include: { department: true, position: true },
        orderBy: [{ position: { rankOrder: 'asc' } }, { lastName: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.employee.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }

  /** Жорий фильтр бўйича ходимлар рўйхатини Excel'га чиқариш (саҳифасиз, 5000 тагача). */
  async exportXlsx(q: ListEmployeesQuery): Promise<Buffer> {
    const rows = await this.prisma.employee.findMany({
      where: this.whereOf(q), include: { department: { include: { parent: true } }, position: true },
      orderBy: [{ position: { rankOrder: 'asc' } }, { lastName: 'asc' }], take: 5000,
    });
    const iso = (d?: Date | null) => (d ? d.toISOString().slice(0, 10).split('-').reverse().join('.') : '');
    const STATUS: Record<string, string> = { ishlamoqda: 'Ишлаяпти', tatilda: 'Таътилда', ishdan_boshagan: 'Ишдан бўшаган' };
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Ходимлар', { views: [{ state: 'frozen', ySplit: 1 }] });
    ws.columns = [
      { header: 'Табель №', key: 'tab', width: 10 }, { header: 'Ф.И.Ш.', key: 'fio', width: 38 }, { header: 'Филиал', key: 'br', width: 26 },
      { header: 'Бўлим', key: 'dep', width: 26 }, { header: 'Лавозим', key: 'pos', width: 28 }, { header: 'Тури', key: 'type', width: 10 },
      { header: 'Ҳолати', key: 'st', width: 14 }, { header: 'Ишга қабул', key: 'hire', width: 12 }, { header: 'Туғилган сана', key: 'birth', width: 13 },
      { header: 'Телефон', key: 'ph', width: 16 }, { header: 'ЖШШИР', key: 'pinfl', width: 16 }, { header: 'Паспорт', key: 'pass', width: 14 },
      { header: 'Шартнома', key: 'ct', width: 22 }, { header: 'Ойлик (сўм)', key: 'sal', width: 15 },
    ];
    ws.getRow(1).font = { bold: true };
    for (const e of rows) {
      ws.addRow({
        tab: e.tabNumber, fio: [e.lastName, e.firstName, e.middleName].filter(Boolean).join(' '),
        br: e.department.parent?.name ?? e.department.name, dep: e.department.parent ? e.department.name : '', pos: e.position.title,
        type: e.employmentType === 'gpx' ? 'ГПХ' : 'Штат', st: STATUS[e.status] ?? e.status, hire: iso(e.hireDate), birth: iso(e.birthDate),
        ph: e.phone ?? '', pinfl: e.pinfl ?? '', pass: e.passportSeriesNumber ?? '',
        ct: [e.contractNumber, iso(e.contractDate)].filter(Boolean).join(' / '), sal: Number(e.salary),
      });
    }
    ws.getColumn('sal').numFmt = '#,##0';
    return Buffer.from(await wb.xlsx.writeBuffer());
  }

  get(id: string) {
    return this.prisma.employee.findUniqueOrThrow({
      where: { id },
      include: {
        department: { include: { parent: true } }, position: true, education: true, workHistory: { orderBy: { startDate: 'asc' } },
        relatives: true, documents: true,
      },
    });
  }

  create(dto: CreateEmployeeDto) {
    return this.prisma.employee.create({
      data: {
        ...this.scalarData(dto),
        education: { create: dto.education ?? [] },
        workHistory: {
          create: (dto.workHistory ?? []).map((w) => ({
            ...w, startDate: toDate(w.startDate), endDate: toDate(w.endDate),
          })),
        },
        relatives: { create: dto.relatives ?? [] },
      } as Prisma.EmployeeUncheckedCreateInput,
    });
  }

  /** Nested ro'yxatlar yuborilsa, to'liq almashtiriladi. */
  update(id: string, dto: UpdateEmployeeDto) {
    return this.prisma.$transaction(async (tx) => {
      if (dto.education) {
        await tx.employeeEducation.deleteMany({ where: { employeeId: id } });
        await tx.employeeEducation.createMany({ data: dto.education.map((e) => ({ ...e, employeeId: id })) });
      }
      if (dto.workHistory) {
        await tx.employeeWorkHistory.deleteMany({ where: { employeeId: id } });
        await tx.employeeWorkHistory.createMany({
          data: dto.workHistory.map((w) => ({
            ...w, employeeId: id, startDate: toDate(w.startDate), endDate: toDate(w.endDate),
          })),
        });
      }
      if (dto.relatives) {
        await tx.employeeRelative.deleteMany({ where: { employeeId: id } });
        await tx.employeeRelative.createMany({ data: dto.relatives.map((r) => ({ ...r, employeeId: id })) });
      }
      return tx.employee.update({ where: { id }, data: this.scalarData(dto) as Prisma.EmployeeUncheckedUpdateInput });
    });
  }

  async remove(id: string) {
    const e = await this.prisma.employee.findUnique({ where: { id }, include: { _count: { select: { orders: true } } } });
    if (!e) throw new NotFoundException('Ходим топилмади');
    if (e._count.orders) throw new BadRequestException('Ходимда буйруқлар бор — бутунлай ўчириб бўлмайди. Ўрнига «Архив»га ўтказинг (ишдан бўшатилган)');
    return this.prisma.employee.delete({ where: { id } });
  }
}
