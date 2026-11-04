import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { PrismaExceptionFilter } from './prisma-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.enableCors();
  app.useGlobalFilters(new PrismaExceptionFilter());
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
    exceptionFactory: (errors) => {
      const fields = errors.map((e) => e.property).join(', ');
      return new BadRequestException(`Киритилган маълумотлар нотўғри: ${fields}`);
    },
  }));
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
