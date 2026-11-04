import { BadRequestException, Body, Controller, Get, NotFoundException, Param, Post, Query, Res, StreamableFile } from '@nestjs/common';
import { IsObject, IsOptional, IsUUID } from 'class-validator';
import type { Response } from 'express';
import { existsSync } from 'fs';
import { calcLeave, workYear } from '../calendar/leave';
import { CalendarService } from '../calendar/calendar.service';
import { DOC_TYPES, DocType, DocumentsService } from './documents.service';

class GenerateDto {
  @IsUUID() employeeId: string;
  @IsOptional() @IsObject() params?: Record<string, any>;
}

@Controller()
export class DocumentsGenController {
  constructor(private svc: DocumentsService, private calendar: CalendarService) {}

  @Post('documents/generate/:type')
  async generate(@Param('type') type: string, @Body() dto: GenerateDto, @Res({ passthrough: true }) res: Response) {
    if (!DOC_TYPES.includes(type as DocType)) throw new NotFoundException(`Номаълум ҳужжат тури: ${type}`);
    // save:false — hujjat bazaga yozilmaydi, faylning o'zi qaytariladi
    const persist = dto.params?.save !== false;
    const r = await this.svc.generate(type as DocType, dto.employeeId, dto.params, persist);
    if ('buffer' in r && r.buffer && 'fileName' in r) {
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Disposition', `attachment; filename="${r.fileName}"`);
      return new StreamableFile(r.buffer);
    }
    return r;
  }

  @Get('documents/generated')
  all(@Query('type') type?: string) { return this.svc.listAll(type); }

  @Get('orders')
  orders(@Query('type') type?: string) { return this.svc.listOrders(type); }

  @Get('orders/:id/download')
  async orderDownload(@Param('id') id: string, @Res() res: Response) {
    const f = await this.svc.orderFile(id);
    if (!existsSync(f.path)) throw new NotFoundException('Файл топилмади');
    return res.download(f.path, f.name);
  }

  @Get('employees/:id/generated')
  list(@Param('id') id: string) { return this.svc.listForEmployee(id); }

  @Get('documents/generated/:id/download')
  async download(@Param('id') id: string, @Res() res: Response) {
    const f = await this.svc.file(id);
    if (!existsSync(f.path)) throw new NotFoundException('Файл топилмади');
    return res.download(f.path, f.name);
  }

  @Get('leave/calc')
  async calc(@Query('start') start: string, @Query('days') days: string, @Query('hireDate') hireDate?: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(start ?? '')) throw new BadRequestException('start: ЙЙЙЙ-ОО-КК');
    try {
      const r = calcLeave(start, Number(days), await this.calendar.overridesAround(start));
      return { ...r, workYear: hireDate && /^\d{4}-\d{2}-\d{2}/.test(hireDate) ? workYear(hireDate.slice(0, 10), start) : null };
    } catch (e) {
      throw new BadRequestException((e as Error).message);
    }
  }
}
