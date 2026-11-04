import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import { Prisma } from '@prisma/client';

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  catch(e: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse();
    const isDelete = ctx.getRequest().method === 'DELETE';
    const map: Record<string, [number, string]> = {
      P2002: [HttpStatus.CONFLICT, 'Бундай ёзув аллақачон мавжуд'],
      P2025: [HttpStatus.NOT_FOUND, 'Ёзув топилмади'],
      P2003: [HttpStatus.BAD_REQUEST, isDelete ? 'Бу ёзувга боғлиқ маълумотлар (ходимлар ёки қуйи бўлимлар) бор, ўчириб бўлмайди' : 'Боғлиқ ёзув топилмади'],
    };
    const [status, message] = map[e.code] ?? [HttpStatus.INTERNAL_SERVER_ERROR, 'Сервер хатоси'];
    res.status(status).json({ statusCode: status, message });
  }
}
