import { BadRequestException, Body, Controller, Delete, Get, HttpCode, NotFoundException, Param, Post, Put, Query, Req, Res, StreamableFile, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { IsObject, IsOptional, IsUUID } from 'class-validator';
import { memoryStorage } from 'multer';
import { Roles } from '../auth/decorators';
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
      res.setHeader('Content-Disposition', `attachment; filename="${r.fileName}"`);
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

  @Get('documents/templates')
  templates() { return this.svc.listTemplates(); }

  @Get('documents/templates/:lang/:name/download')
  templateDownload(@Param('lang') lang: string, @Param('name') name: string, @Query('source') source: string | undefined, @Res() res: Response) {
    const f = this.svc.templateFile(lang, name, source === 'default');
    return res.download(f.path, f.name);
  }

  @Roles('superadmin')
  @Put('documents/templates/:lang/:name')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: 5 * 1024 * 1024, files: 1 } }))
  uploadTemplate(@Param('lang') lang: string, @Param('name') name: string, @UploadedFile() file: { buffer: Buffer; originalname: string } | undefined, @Req() req: any) {
    if (!file) throw new BadRequestException('Файл танланмаган');
    if (!/\.docx$/i.test(file.originalname)) throw new BadRequestException('Фақат .docx файл қабул қилинади');
    const r = this.svc.uploadTemplate(lang, name, file.buffer);
    req.auditSummary = `Шаблон юкланди: ${lang}/${name}`;
    return r;
  }

  @Roles('superadmin')
  @Delete('documents/templates/:lang/:name')
  @HttpCode(204)
  resetTemplate(@Param('lang') lang: string, @Param('name') name: string, @Req() req: any) {
    this.svc.resetTemplate(lang, name);
    req.auditSummary = `Шаблон стандартга қайтарилди: ${lang}/${name}`;
  }

  @Roles('superadmin')
  @Post('documents/templates/:lang/:name/restore')
  @HttpCode(204)
  restoreTemplate(@Param('lang') lang: string, @Param('name') name: string, @Req() req: any) {
    this.svc.restoreTemplate(lang, name);
    req.auditSummary = `Шаблоннинг олдинги версияси тикланди: ${lang}/${name}`;
  }

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
