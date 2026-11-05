import { BadRequestException, Body, Controller, Delete, Get, HttpCode, NotFoundException, Param, Post, Put, Query, Req, Res, StreamableFile } from '@nestjs/common';
import { IsObject, IsOptional, IsUUID } from 'class-validator';
import type { Response } from 'express';
import { existsSync } from 'fs';
import { calcLeave, workYear } from '../calendar/leave';
import { CalendarService } from '../calendar/calendar.service';
import { DOC_TYPES, DocType, DocumentsService } from './documents.service';

class UpdateDto { @IsOptional() @IsObject() params?: Record<string, any>; }
class GenerateDto {
  @IsUUID() employeeId: string;
  @IsOptional() @IsObject() params?: Record<string, any>;
}

@Controller()
export class DocumentsGenController {
  constructor(private svc: DocumentsService, private calendar: CalendarService) {}

  @Post('documents/generate/:type')
  async generate(@Param('type') type: string, @Body() dto: GenerateDto, @Res({ passthrough: true }) res: Response, @Req() req: any) {
    if (!DOC_TYPES.includes(type as DocType)) throw new NotFoundException(`Номаълум ҳужжат тури: ${type}`);
    // save:false — hujjat bazaga yozilmaydi, faylning o'zi qaytariladi
    const persist = dto.params?.save !== false;
    const r = await this.svc.generate(type as DocType, dto.employeeId, dto.params, persist);
    req.auditSummary = r.summary;
    if ('buffer' in r && r.buffer && 'fileName' in r) {
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.attachment(r.fileName);   // кирилл/махсус белгили номлар учун RFC 5987 (filename*) автоматик
      return new StreamableFile(r.buffer);
    }
    return r;
  }

  @Get('documents/generated')
  all(@Query('type') type?: string) { return this.svc.listAll(type); }

  @Get('orders/export')
  async ordersExport(@Query('type') type: string | undefined, @Res() res: Response) {
    const buf = await this.svc.exportOrdersXlsx(type);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="buyruqlar.xlsx"');
    res.send(buf);
  }

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

  @Delete('documents/generated/:id')
  @HttpCode(204)
  async removeGenerated(@Param('id') id: string, @Req() req: any) { req.auditSummary = await this.svc.removeGenerated(id); }

  @Delete('orders/:id')
  @HttpCode(204)
  async removeOrder(@Param('id') id: string, @Req() req: any) { req.auditSummary = await this.svc.removeOrder(id); }

  @Put('documents/generated/:id')
  async updateGenerated(@Param('id') id: string, @Body() dto: UpdateDto, @Req() req: any) {
    const r = await this.svc.update(id, dto.params ?? {});
    req.auditSummary = r.summary;
    return r;
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
