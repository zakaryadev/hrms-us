import { BadRequestException, INestApplication, ValidationPipe } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { PrismaExceptionFilter } from './prisma-exception.filter';

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
  app.useGlobalFilters(new PrismaExceptionFilter());
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
    exceptionFactory: (errors) => {
      const fields = errors.map((e) => e.property).join(', ');
      return new BadRequestException(`Киритилган маълумотлар нотўғри: ${fields}`);
    },
  }));
}
