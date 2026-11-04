import { BadRequestException, Body, Controller, Get, NotFoundException, Param, Post, Query, Res } from '@nestjs/common';
import { IsObject, IsOptional, IsUUID } from 'class-validator';
import type { Response } from 'express';
import { existsSync } from 'fs';
import { calcLeave, workYear } from '../calendar/leave';
import { DOC_TYPES, DocType, DocumentsService } from './documents.service';

class GenerateDto {
  @IsUUID() employeeId: string;
  @IsOptional() @IsObject() params?: Record<string, any>;
}

@Controller()
export class DocumentsGenController {
  constructor(private svc: DocumentsService) {}

  @Post('documents/generate/:type')
  generate(@Param('type') type: string, @Body() dto: GenerateDto) {
    if (!DOC_TYPES.includes(type as DocType)) throw new NotFoundException(`Noma'lum hujjat turi: ${type}`);
    return this.svc.generate(type as DocType, dto.employeeId, dto.params);
  }

  @Get('employees/:id/generated')
  list(@Param('id') id: string) { return this.svc.listForEmployee(id); }

  @Get('documents/generated/:id/download')
  async download(@Param('id') id: string, @Res() res: Response) {
    const f = await this.svc.file(id);
    if (!existsSync(f.path)) throw new NotFoundException('Fayl topilmadi');
    return res.download(f.path, f.name);
  }

  @Get('leave/calc')
  calc(@Query('start') start: string, @Query('days') days: string, @Query('hireDate') hireDate?: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(start ?? '')) throw new BadRequestException('start: YYYY-MM-DD');
    try {
      const r = calcLeave(start, Number(days));
      return { ...r, workYear: hireDate && /^\d{4}-\d{2}-\d{2}/.test(hireDate) ? workYear(hireDate.slice(0, 10), start) : null };
    } catch (e) {
      throw new BadRequestException((e as Error).message);
    }
  }
}
