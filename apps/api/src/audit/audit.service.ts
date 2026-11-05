import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface AuditEntry {
  userId?: string | null; userLogin?: string | null; userName?: string | null;
  action: string; entity: string; entityId?: string | null; summary?: string | null;
  method: string; path: string; status: number; ip?: string | null;
}

@Injectable()
export class AuditService implements OnModuleInit, OnModuleDestroy {
  private log = new Logger('Audit');
  private timer?: NodeJS.Timeout;
  constructor(private prisma: PrismaService) {}

  /** Эски журнал ёзувларини тозалаш: AUDIT_RETENTION_DAYS (одатда 730 кун ≈ 2 йил; 0 — тозаламаслик). */
  async purgeOld() {
    const days = Number(process.env.AUDIT_RETENTION_DAYS ?? 730);
    if (!days || days < 0) return 0;
    try {
      const { count } = await this.prisma.auditLog.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - days * 86_400_000) } } });
      if (count) this.log.log(`Журналдан ${count} та эски ёзув ўчирилди`);
      return count;
    } catch (err) { this.log.error(`Журнални тозалаб бўлмади: ${(err as Error).message}`); return 0; }
  }
  onModuleInit() {
    if (process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID) return;
    void this.purgeOld();
    this.timer = setInterval(() => void this.purgeOld(), 24 * 3600_000);
    this.timer.unref();
  }
  onModuleDestroy() { if (this.timer) clearInterval(this.timer); }

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
