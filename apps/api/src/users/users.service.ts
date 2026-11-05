import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { AuthService, validatePassword } from '../auth/auth.service';
import { PrismaService } from '../prisma/prisma.service';

const SAFE = { id: true, login: true, fullName: true, role: true, active: true, createdAt: true } as const;

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService, private auth: AuthService) {}

  list() { return this.prisma.user.findMany({ select: SAFE, orderBy: [{ createdAt: 'asc' }] }); }

  async create(d: { login: string; fullName: string; role: UserRole; password: string }) {
    validatePassword(d.password);
    const login = d.login.toLowerCase();
    if (await this.prisma.user.findUnique({ where: { login } })) throw new ConflictException('Бундай логин аллақачон мавжуд');
    return this.prisma.user.create({
      data: { login, fullName: d.fullName.trim(), role: d.role, passwordHash: await this.auth.hash(d.password) }, select: SAFE,
    });
  }

  /** Охирги фаол superadmin ни ўчириш ёки ролини тушириш мумкин эмас. */
  private async assertNotLastAdmin(id: string, change: { role?: UserRole; active?: boolean }) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Фойдаланувчи топилмади');
    const losesAdmin = user.role === 'superadmin' && user.active &&
      ((change.role !== undefined && change.role !== 'superadmin') || change.active === false);
    if (!losesAdmin) return;
    const others = await this.prisma.user.count({ where: { role: 'superadmin', active: true, id: { not: id } } });
    if (others === 0) throw new BadRequestException('Охирги фаол Суперадминни ўчириб ёки ролини ўзгартириб бўлмайди');
  }

  async update(id: string, d: { fullName?: string; role?: UserRole; active?: boolean; password?: string }) {
    await this.assertNotLastAdmin(id, { role: d.role, active: d.active });
    const data: Record<string, unknown> = {};
    if (d.fullName !== undefined) data.fullName = d.fullName.trim();
    if (d.role !== undefined) data.role = d.role;
    if (d.active !== undefined) data.active = d.active;
    if (d.password) { validatePassword(d.password); data.passwordHash = await this.auth.hash(d.password); }
    return this.prisma.user.update({ where: { id }, data, select: SAFE });
  }

  /** Ўзини ва охирги фаол суперадминни ўчириб бўлмайди. Журнал ёзувлари (логин/исм) сақланиб қолади. */
  async remove(id: string, currentUserId: string) {
    if (id === currentUserId) throw new BadRequestException('Ўз ҳисобингизни ўчириб бўлмайди');
    await this.assertNotLastAdmin(id, { active: false });
    const u = await this.prisma.user.delete({ where: { id }, select: SAFE });
    return u;
  }
}
