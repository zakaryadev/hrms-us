import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import { Prisma } from '@prisma/client';

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  catch(e: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse();
    const isDelete = ctx.getRequest().method === 'DELETE';
    const map: Record<string, [number, string]> = {
      P2002: [HttpStatus.CONFLICT, 'Bunday yozuv allaqachon mavjud'],
      P2025: [HttpStatus.NOT_FOUND, 'Yozuv topilmadi'],
      P2003: [HttpStatus.BAD_REQUEST, isDelete ? 'Bu yozuvga bog\'liq ma\'lumotlar (xodimlar yoki quyi bo\'limlar) bor, o\'chirib bo\'lmaydi' : 'Bog\'liq yozuv topilmadi'],
    };
    const [status, message] = map[e.code] ?? [HttpStatus.INTERNAL_SERVER_ERROR, 'Server xatosi'];
    res.status(status).json({ statusCode: status, message });
  }
}
