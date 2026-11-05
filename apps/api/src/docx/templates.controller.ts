import { BadRequestException, Controller, Delete, Get, HttpCode, Param, Post, Put, Query, Req, Res, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { memoryStorage } from 'multer';
import { Roles } from '../auth/decorators';
import { TemplatesService } from './templates.service';

/** Word шаблонлар: рўйхат, юклаб олиш (исталган ёзувда), алмаштириш, стандартга қайтариш, олдинги версия */
@Controller('documents/templates')
export class TemplatesController {
  constructor(private svc: TemplatesService) {}

  @Get() list() { return this.svc.list(); }

  /** ?script=cyr|lat|lat-new — шу ёзувда (керак бўлса бутун матн автоматик ўгирилади); ?source=default — стандарт шаблон */
  @Get(':name/download')
  download(@Param('name') name: string, @Query('script') script: string | undefined, @Query('source') source: string | undefined, @Res() res: Response) {
    const f = this.svc.download(name, script ?? 'cyr', source === 'default');
    res.attachment(f.name);
    res.send(f.buffer);
  }

  /** Битта шаблон юкланади — ёзуви (кирилл/лотин) автоматик аниқланади; қолган ёзувлар ўгириш орқали ҳосил бўлади */
  @Roles('superadmin')
  @Put(':name')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: 5 * 1024 * 1024, files: 1 } }))
  upload(@Param('name') name: string, @Query('script') script: string | undefined, @UploadedFile() file: { buffer: Buffer; originalname: string } | undefined, @Req() req: any) {
    if (!file) throw new BadRequestException('Файл танланмаган');
    if (!/\.docx$/i.test(file.originalname)) throw new BadRequestException('Фақат .docx файл қабул қилинади');
    const r = this.svc.upload(name, file.buffer, script);
    req.auditSummary = `Шаблон юкланди: ${name} (${r.script})`;
    return r;
  }

  @Roles('superadmin')
  @Delete(':name')
  @HttpCode(204)
  reset(@Param('name') name: string, @Req() req: any) {
    this.svc.reset(name);
    req.auditSummary = `Шаблон стандартга қайтарилди: ${name}`;
  }

  @Roles('superadmin')
  @Post(':name/restore')
  @HttpCode(204)
  restore(@Param('name') name: string, @Req() req: any) {
    this.svc.restore(name);
    req.auditSummary = `Шаблоннинг олдинги версияси тикланди: ${name}`;
  }
}
