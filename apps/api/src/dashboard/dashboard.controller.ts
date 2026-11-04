import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller('dashboard')
export class DashboardController {
  constructor(private prisma: PrismaService) {}

  @Get('stats')
  async stats() {
    const [positions, employees, departments] = await Promise.all([
      this.prisma.position.findMany({ select: { id: true, departmentId: true, staffCount: true } }),
      this.prisma.employee.findMany({
        where: { status: { not: 'ishdan_boshagan' } },
        select: { departmentId: true, status: true, employmentType: true },
      }),
      this.prisma.department.findMany({ orderBy: { name: 'asc' } }),
    ]);
    const totalStaff = positions.reduce((s, p) => s + p.staffCount, 0);
    const shtatEmployees = employees.filter((e) => e.employmentType === 'shtat');
    return {
      totalStaff,
      occupiedStaff: shtatEmployees.length,
      vacantStaff: Math.max(totalStaff - shtatEmployees.length, 0),
      totalEmployees: employees.length,
      onLeave: employees.filter((e) => e.status === 'tatilda').length,
      gpx: employees.filter((e) => e.employmentType === 'gpx').length,
      departments: departments.map((d) => ({
        id: d.id,
        name: d.name,
        staff: positions.filter((p) => p.departmentId === d.id).reduce((s, p) => s + p.staffCount, 0),
        occupied: shtatEmployees.filter((e) => e.departmentId === d.id).length,
      })),
    };
  }
}
