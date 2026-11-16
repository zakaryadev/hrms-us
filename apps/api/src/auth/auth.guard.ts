import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { COOKIE_NAME } from './auth.constants';
import { IS_PUBLIC, ROLES } from './decorators';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const ACCOUNTANT_WRITABLE = ['/timesheet', '/auth'];
// Журнал ходимлари (operator, rahbar) фақат журнални ва ўз ҳисобини кўради — кадрлар маълумотига киролмайди
const JOURNAL_ONLY: UserRole[] = ['operator', 'rahbar'];
const JOURNAL_WRITERS: UserRole[] = ['superadmin', 'operator'];
const inPath = (path: string, p: string) => path === p || path.startsWith(p + '/');

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private reflector: Reflector, private jwt: JwtService, private prisma: PrismaService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const targets = [ctx.getHandler(), ctx.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, targets)) return true;

    const req = ctx.switchToHttp().getRequest();
    const token: string | undefined = req.cookies?.[COOKIE_NAME];
    if (!token) throw new UnauthorizedException('Тизимга киринг');
    let payload: { sub: string };
    try { payload = await this.jwt.verifyAsync(token); } catch { throw new UnauthorizedException('Сессия тугаган, қайта киринг'); }

    // Ҳар сўровда фойдаланувчи базадан олинади: ўчирилган/рол ўзгартирилган ҳисоб дарҳол таъсир қилади
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || !user.active) throw new UnauthorizedException('Сессия тугаган, қайта киринг');
    req.user = { id: user.id, login: user.login, fullName: user.fullName, role: user.role };

    const roles = this.reflector.getAllAndOverride<UserRole[] | undefined>(ROLES, targets);
    if (roles?.length && !roles.includes(user.role)) throw new ForbiddenException('Бу амал учун рухсат йўқ');
    const apiPath = String(req.originalUrl ?? req.url).split('?')[0].replace(/^\/api/, '');
    if (JOURNAL_ONLY.includes(user.role) && !['/journal', '/auth'].some((p) => inPath(apiPath, p))) throw new ForbiddenException('Бу амал учун рухсат йўқ');
    if (inPath(apiPath, '/journal') && !SAFE_METHODS.has(req.method) && !JOURNAL_WRITERS.includes(user.role)) throw new ForbiddenException('Журналга ёзиш учун рухсат йўқ');
    // Бухгалтер: ҳамма жойни кўра олади, ўзгартира олиши фақат табелда (ва ўз паролида)
    if (user.role === 'buxgalter' && !SAFE_METHODS.has(req.method)) {
      const path = String(req.originalUrl ?? req.url).split('?')[0].replace(/^\/api/, '');
      if (!ACCOUNTANT_WRITABLE.some((p) => path === p || path.startsWith(p + '/'))) throw new ForbiddenException('Бу амал учун рухсат йўқ (бухгалтер фақат кўриш ва табел)');
    }
    return true;
  }
}
