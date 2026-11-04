import { BadRequestException, Injectable } from '@nestjs/common';
import * as XLSX from 'xlsx';
import { PrismaService } from '../prisma/prisma.service';

/** Excel ustun sarlavhalari (o'zbekcha) -> maydon nomlari */
const COLUMNS: Record<string, string> = {
  'tabel raqami': 'tabNumber',
  'familiya': 'lastName',
  'ism': 'firstName',
  'otasining ismi': 'middleName',
  'tug\'ilgan sana': 'birthDate',
  'jinsi': 'gender',
  'millati': 'nationality',
  'telefon': 'phone',
  'manzil': 'addressResidential',
  'jshshir': 'pinfl',
  'pasport': 'passportSeriesNumber',
  'bo\'lim': 'department',
  'lavozim': 'position',
  'turi': 'employmentType',
  'ishga qabul sanasi': 'hireDate',
  'oylik': 'salary',
  // Kirill sarlavhalar (UI shu nomlarni ko'rsatadi)
  'табель рақами': 'tabNumber', 'фамилия': 'lastName', 'исм': 'firstName', 'отасининг исми': 'middleName',
  'туғилган сана': 'birthDate', 'жинси': 'gender', 'миллати': 'nationality', 'телефон': 'phone', 'манзил': 'addressResidential',
  'жшшир': 'pinfl', 'паспорт': 'passportSeriesNumber', 'бўлим': 'department', 'лавозим': 'position', 'тури': 'employmentType',
  'ишга қабул санаси': 'hireDate', 'ойлик': 'salary',
};

export interface ImportResult {
  created: number;
  updated: number;
  errors: { row: number; message: string }[];
}

function parseDate(v: unknown): Date | undefined {
  if (v === undefined || v === null || v === '') return undefined;
  if (v instanceof Date) return v;
  const s = String(v).trim();
  const m = s.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})$/);
  const d = m ? new Date(Date.UTC(+m[3], +m[2] - 1, +m[1])) : new Date(s);
  return isNaN(d.getTime()) ? undefined : d;
}

@Injectable()
export class EmployeesImportService {
  constructor(private prisma: PrismaService) {}

  async import(buffer: Buffer): Promise<ImportResult> {
    let rows: Record<string, unknown>[];
    try {
      const wb = XLSX.read(buffer, { type: 'buffer', cellDates: true });
      rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' });
    } catch {
      throw new BadRequestException('Excel файлни ўқиб бўлмади');
    }

    const result: ImportResult = { created: 0, updated: 0, errors: [] };
    for (let i = 0; i < rows.length; i++) {
      const rowNo = i + 2; // 1-qator sarlavha
      const r: Record<string, any> = {};
      for (const [k, v] of Object.entries(rows[i])) {
        const f = COLUMNS[k.trim().toLowerCase()];
        if (f) r[f] = typeof v === 'string' ? v.trim() : v;
      }
      try {
        if (!r.tabNumber || !r.firstName || !r.lastName) throw new Error('Табель рақами, фамилия ва исм мажбурий');
        if (!r.department || !r.position) throw new Error('Бўлим ва лавозим мажбурий');
        if (r.pinfl && !/^\d{14}$/.test(String(r.pinfl))) throw new Error('ЖШШИР 14 та рақамдан иборат бўлиши керак');

        const dept =
          (await this.prisma.department.findFirst({ where: { name: r.department } })) ??
          (await this.prisma.department.create({ data: { name: r.department } }));
        const pos =
          (await this.prisma.position.findFirst({ where: { title: r.position, departmentId: dept.id } })) ??
          (await this.prisma.position.create({ data: { title: r.position, departmentId: dept.id } }));

        const gender = String(r.gender ?? '').toLowerCase();
        const data = {
          tabNumber: String(r.tabNumber),
          firstName: r.firstName,
          lastName: r.lastName,
          middleName: r.middleName || undefined,
          birthDate: parseDate(r.birthDate),
          gender: /^(e|э|эр)/.test(gender) ? ('erkak' as const) : /^(a|а|аё)/.test(gender) ? ('ayol' as const) : undefined,
          nationality: r.nationality || undefined,
          phone: r.phone ? String(r.phone) : undefined,
          addressResidential: r.addressResidential || undefined,
          pinfl: r.pinfl ? String(r.pinfl) : undefined,
          passportSeriesNumber: r.passportSeriesNumber || undefined,
          departmentId: dept.id,
          positionId: pos.id,
          employmentType: ['gpx', 'гпх'].includes(String(r.employmentType ?? '').toLowerCase()) ? ('gpx' as const) : ('shtat' as const),
          hireDate: parseDate(r.hireDate),
          salary: r.salary !== '' && r.salary != null ? Number(String(r.salary).replace(/\s/g, '')) || 0 : undefined,
        };
        const existing = await this.prisma.employee.findUnique({ where: { tabNumber: data.tabNumber } });
        if (existing) {
          await this.prisma.employee.update({ where: { id: existing.id }, data });
          result.updated++;
        } else {
          await this.prisma.employee.create({ data });
          result.created++;
        }
      } catch (e) {
        result.errors.push({ row: rowNo, message: (e as Error).message });
      }
    }
    return result;
  }
}
