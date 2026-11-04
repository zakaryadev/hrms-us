import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { buildSeries, delta, lastMonths } from './dashboard.metrics';

const ORDER_LABEL: Record<string, string> = {
  ishga_qabul: 'Ишга қабул', lavozim_otkazish: 'Лавозимга ўтказиш', tatil_berish: 'Меҳнат таътили', ishdan_boshatish: 'Ишдан бўшатиш', ragbatlantirish: 'Рағбатлантириш',
};
const DOC_LABEL: Record<string, string> = {
  obyektivka: 'Маълумотнома', ariza: 'Ариза', kelishuv: 'Қўшимча келишув', 'buyruq-otkazish': 'Ўтказиш буйруғи', 'buyruq-tatil': 'Таътил буйруғи',
};
const fio = (e: { lastName: string; firstName: string; middleName?: string | null }) => [e.lastName, e.firstName, e.middleName].filter(Boolean).join(' ');
const iso = (d: Date) => d.toISOString().slice(0, 10);

@Controller('dashboard')
export class DashboardController {
  constructor(private prisma: PrismaService) {}

  @Get('stats')
  async stats() {
    const todayIso = iso(new Date());
    const months = lastMonths(12);
    const since = new Date(Date.UTC(Number(months[0].key.slice(0, 4)), Number(months[0].key.slice(5)) - 1, 1));
    const [positions, employees, departments, leaveOrders, recent, newEmployees, newDocs] = await Promise.all([
      this.prisma.position.findMany({ select: { id: true, departmentId: true, staffCount: true } }),
      this.prisma.employee.findMany({
        where: { status: { not: 'ishdan_boshagan' } },
        select: { id: true, departmentId: true, status: true, employmentType: true, hireDate: true, createdAt: true },
      }),
      this.prisma.department.findMany({ orderBy: { name: 'asc' } }),
      this.prisma.order.findMany({ where: { orderType: 'tatil_berish', orderDate: { gte: new Date(Date.now() - 400 * 86_400_000) } }, select: { employeeId: true, payloadJson: true } }),
      this.prisma.order.findMany({ orderBy: { createdAt: 'desc' }, take: 6, include: { employee: { select: { id: true, tabNumber: true, firstName: true, lastName: true, middleName: true, photoUrl: true } } } }),
      this.prisma.employee.findMany({ orderBy: { createdAt: 'desc' }, take: 5, select: { firstName: true, lastName: true, middleName: true, createdAt: true, position: { select: { title: true } } } }),
      this.prisma.generatedDocument.findMany({ orderBy: { createdAt: 'desc' }, take: 5, select: { type: true, createdAt: true, employee: { select: { firstName: true, lastName: true, middleName: true } } } }),
    ]);

    const leaves = leaveOrders.map((o) => o.payloadJson as { startDate?: string; calculated?: { endDate?: string } } | null);
    // Таътилда: ҳолати «таътилда» ёки бугунги сана таътил буйруғи оралиғида
    const onLeaveByOrder = new Set(leaveOrders.filter((o, i) => {
      const p = leaves[i];
      return p?.startDate && p.calculated?.endDate && p.startDate <= todayIso && todayIso <= p.calculated.endDate;
    }).map((o) => o.employeeId));

    const totalStaff = positions.reduce((s, p) => s + p.staffCount, 0);
    const shtatEmployees = employees.filter((e) => e.employmentType === 'shtat');
    const series = buildSeries(
      employees.map((e) => ({ hireIso: iso(e.hireDate ?? e.createdAt), shtat: e.employmentType === 'shtat' })),
      leaves.map((p) => p?.startDate).filter((d): d is string => !!d && d >= iso(since)),
      totalStaff, months,
    );

    const deptRows = departments.map((d) => ({
      id: d.id, name: d.name,
      staff: positions.filter((p) => p.departmentId === d.id).reduce((s, p) => s + p.staffCount, 0),
      occupied: shtatEmployees.filter((e) => e.departmentId === d.id).length,
      employees: employees.filter((e) => e.departmentId === d.id).length,
    }));

    const activity = [
      ...newEmployees.map((e) => ({ kind: 'employee', title: 'Янги ходим қўшилди', text: `${fio(e)} · ${e.position.title}`, at: e.createdAt })),
      ...recent.map((o) => ({ kind: 'order', title: `Буйруқ яратилди № ${o.orderNumber}`, text: `${ORDER_LABEL[o.orderType] ?? o.orderType} — ${fio(o.employee)}`, at: o.createdAt })),
      ...newDocs.map((d) => ({ kind: 'document', title: 'Ҳужжат яратилди', text: `${DOC_LABEL[d.type] ?? d.type} — ${fio(d.employee)}`, at: d.createdAt })),
    ].sort((a, b) => b.at.getTime() - a.at.getTime()).slice(0, 6).map((a) => ({ ...a, at: a.at.toISOString() }));

    return {
      totalStaff,
      occupiedStaff: shtatEmployees.length,
      vacantStaff: Math.max(totalStaff - shtatEmployees.length, 0),
      totalEmployees: employees.length,
      onLeave: employees.filter((e) => e.status === 'tatilda' || onLeaveByOrder.has(e.id)).length,
      gpx: employees.filter((e) => e.employmentType === 'gpx').length,
      departments: deptRows.map(({ employees: _e, ...d }) => d),
      months: months.map((m) => ({ key: m.key, label: m.label, year: m.year })),
      series,
      deltas: { headcount: delta(series.headcount), occupancy: delta(series.occupancy), vacant: delta(series.vacant), leaves: delta(series.leaves), hires: delta(series.hires) },
      distribution: deptRows.filter((d) => d.employees > 0).map((d) => ({ name: d.name, count: d.employees })).sort((a, b) => b.count - a.count),
      recentOrders: recent.map((o) => ({
        id: o.id, orderNumber: o.orderNumber, orderType: o.orderType, typeLabel: ORDER_LABEL[o.orderType] ?? o.orderType, orderDate: o.orderDate,
        employee: { id: o.employee.id, fullName: fio(o.employee), tabNumber: o.employee.tabNumber, photoUrl: o.employee.photoUrl },
      })),
      activity,
    };
  }
}
