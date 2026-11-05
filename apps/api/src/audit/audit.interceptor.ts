import { CallHandler, ExecutionContext, HttpException, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { AuditService } from './audit.service';

const READ = new Set(['GET', 'HEAD', 'OPTIONS']);
const ID = /^(?:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|\d{4}-\d{2}-\d{2})$/i;

/** Барча ўзгартирувчи (POST/PUT/PATCH/DELETE) сўровларни журналга ёзади. Тана (парол ва ш.к.) ёзилмайди. */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private audit: AuditService) {}

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (ctx.getType() !== 'http') return next.handle();
    const req = ctx.switchToHttp().getRequest();
    if (READ.has(req.method)) return next.handle();
    const res = ctx.switchToHttp().getResponse();
    const path: string = String(req.originalUrl ?? req.url).split('?')[0].replace(/^\/api/, '');
    const isLogin = path === '/auth/login';

    const write = (status: number, failed: boolean) => {
      // Хато сўровлар (403/400…) журналга тушмайди; фақат муваффақиятсиз киришга уриниш ёзилади
      if (failed && !isLogin) return;
      const seg = path.split('/').filter(Boolean);
      const u = req.user as { id: string; login: string; fullName: string } | undefined;
      const action = isLogin ? (failed ? 'login_failed' : 'login')
        : seg[0] === 'auth' ? seg[1] ?? 'auth'
        : req.method === 'DELETE' ? 'delete' : req.method === 'POST' ? 'create' : 'update';
      void this.audit.record({
        userId: u?.id, userLogin: u?.login ?? (isLogin ? String(req.body?.login ?? '').slice(0, 64) : null), userName: u?.fullName,
        action, entity: seg[0] ?? '-', entityId: seg.find((s) => ID.test(s)) ?? null,
        summary: typeof req.auditSummary === 'string' ? req.auditSummary.slice(0, 500) : null,
        method: req.method, path, status, ip: req.ip ?? null,
      });
    };
    return next.handle().pipe(tap({
      next: () => write(res.statusCode, false),
      error: (e) => write(e instanceof HttpException ? e.getStatus() : 500, true),
    }));
  }
}
