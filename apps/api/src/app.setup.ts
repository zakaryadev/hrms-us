import { ArgumentsHost, BadRequestException, Catch, ExceptionFilter, INestApplication, PayloadTooLargeException, ValidationPipe } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { PrismaExceptionFilter } from './prisma-exception.filter';

/** Multer «File too large» хатосини кириллда қайтаради */
@Catch(PayloadTooLargeException)
class TooLargeFilter implements ExceptionFilter {
  catch(_e: PayloadTooLargeException, host: ArgumentsHost) {
    host.switchToHttp().getResponse().status(413).json({ statusCode: 413, message: 'Файл ҳажми рухсат этилгандан катта (расм — 5 МБ, ҳужжат — 10 МБ гача)' });
  }
}

/** main.ts va e2e тестлар учун умумий созламалар */
export function configureApp(app: INestApplication) {
  const express = app as NestExpressApplication;
  // nginx орқасида ҳақиқий IP (логин чекловида) олиш учун: TRUST_PROXY=1
  if (process.env.TRUST_PROXY) express.set('trust proxy', Number(process.env.TRUST_PROXY) || process.env.TRUST_PROXY);
  app.setGlobalPrefix('api');
  app.use(helmet());
  app.use(cookieParser());
  // Одатда same-origin (nginx /api ни проксилайди). Алоҳида домен керак бўлса CORS_ORIGIN беринг.
  const origins = process.env.CORS_ORIGIN?.split(',').map((s) => s.trim()).filter(Boolean);
  app.enableCors({ origin: origins?.length ? origins : false, credentials: true });
  app.useGlobalFilters(new PrismaExceptionFilter(), new TooLargeFilter());
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
    exceptionFactory: (errors) => {
      const fields = errors.map((e) => e.property).join(', ');
      return new BadRequestException(`Киритилган маълумотлар нотўғри: ${fields}`);
    },
  }));
}
