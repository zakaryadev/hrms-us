import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface AuditEntry {
  userId?: string | null; userLogin?: string | null; userName?: string | null;
  action: string; entity: string; entityId?: string | null; summary?: string | null;
  method: string; path: string; status: number; ip?: string | null;
}

@Injectable()
export class AuditService {
  private log = new Logger('Audit');
  constructor(private prisma: PrismaService) {}

  /** Журнал ёзуви асосий амални ҳеч қачон бузмаслиги керак. */
  async record(e: AuditEntry) {
    try { await this.prisma.auditLog.create({ data: e }); } catch (err) { this.log.error(`Журналга ёзиб бўлмади: ${(err as Error).message}`); }
  }

  async list(q: { entity?: string; userId?: string; q?: string; page?: number; pageSize?: number }) {
    const pageSize = Math.min(Math.max(q.pageSize ?? 50, 1), 200);
    const page = Math.max(q.page ?? 1, 1);
    const where = {
      ...(q.entity && { entity: q.entity }),
      ...(q.userId && { userId: q.userId }),
      ...(q.q && { OR: [
        { userLogin: { contains: q.q, mode: 'insensitive' as const } },
        { userName: { contains: q.q, mode: 'insensitive' as const } },
        { summary: { contains: q.q, mode: 'insensitive' as const } },
        { entityId: { contains: q.q } },
      ] }),
    };
    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
      this.prisma.auditLog.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }
}
