import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
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

  async list(q: ListEmployeesQuery) {
    const page = Math.max(q.page ?? 1, 1);
    const pageSize = Math.min(Math.max(q.pageSize ?? 20, 1), 200);
    const where: Prisma.EmployeeWhereInput = {
      ...(q.departmentId && { departmentId: q.departmentId }),
      ...(q.status && { status: q.status as any }),
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

  get(id: string) {
    return this.prisma.employee.findUniqueOrThrow({
      where: { id },
      include: {
        department: true, position: true, education: true, workHistory: { orderBy: { startDate: 'asc' } },
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

  remove(id: string) {
    return this.prisma.employee.delete({ where: { id } });
  }
}
