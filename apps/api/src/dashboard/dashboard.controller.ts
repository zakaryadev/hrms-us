import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller('dashboard')
export class DashboardController {
  constructor(private prisma: PrismaService) {}

  @Get('stats')
  async stats() {
    const todayIso = new Date().toISOString().slice(0, 10);
    const [positions, employees, departments, leaveOrders] = await Promise.all([
      this.prisma.position.findMany({ select: { id: true, departmentId: true, staffCount: true } }),
      this.prisma.employee.findMany({
        where: { status: { not: 'ishdan_boshagan' } },
        select: { id: true, departmentId: true, status: true, employmentType: true },
      }),
      this.prisma.department.findMany({ orderBy: { name: 'asc' } }),
      this.prisma.order.findMany({ where: { orderType: 'tatil_berish', orderDate: { gte: new Date(Date.now() - 400 * 86_400_000) } }, select: { employeeId: true, payloadJson: true } }),
    ]);
    // Таътилда: ҳолати «таътилда» ёки бугунги сана таътил буйруғи оралиғида
    const onLeaveByOrder = new Set(leaveOrders.filter((o) => {
      const p = o.payloadJson as { startDate?: string; calculated?: { endDate?: string } } | null;
      return p?.startDate && p.calculated?.endDate && p.startDate <= todayIso && todayIso <= p.calculated.endDate;
    }).map((o) => o.employeeId));
    const totalStaff = positions.reduce((s, p) => s + p.staffCount, 0);
    const shtatEmployees = employees.filter((e) => e.employmentType === 'shtat');
    return {
      totalStaff,
      occupiedStaff: shtatEmployees.length,
      vacantStaff: Math.max(totalStaff - shtatEmployees.length, 0),
      totalEmployees: employees.length,
      onLeave: employees.filter((e) => e.status === 'tatilda' || onLeaveByOrder.has(e.id)).length,
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
