import { BadRequestException, Body, Controller, Post, Res, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { memoryStorage } from 'multer';
import { convertDocx } from '../docx/convert';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { detectScript, transliterate, type Apostrophe, type Target } from './translit';

class TranslitDto {
  @IsString() @MaxLength(50_000) text: string;
  @IsIn(['cyr', 'lat', 'lat-new']) to: Target;
  @IsOptional() @IsIn(['modifier', 'ascii', 'none']) apostrophe?: Apostrophe;
}

/** Транслитератор: кирилл ⇄ лотин ⇄ янги лотин алифбоси (журналга ёзилмайди) */
@Controller('translit')
export class TranslitController {
  @Post() run(@Body() dto: TranslitDto) {
    return { result: transliterate(dto.text, dto.to, { apostrophe: dto.apostrophe }), source: detectScript(dto.text) };
  }

  /** Word (.docx) файлнинг БУТУН матнини ўгириб беради (форматлаш, жадвал ва расм сақланади) */
  @Post('docx')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: 10 * 1024 * 1024, files: 1 } }))
  docx(@UploadedFile() file: { buffer: Buffer; originalname: string } | undefined, @Body('to') to: string, @Res() res: Response) {
    if (!file) throw new BadRequestException('Файл танланмаган');
    if (!/\.docx$/i.test(file.originalname)) throw new BadRequestException('Фақат .docx файл қабул қилинади');
    if (!['cyr', 'lat', 'lat-new'].includes(to)) throw new BadRequestException('«to»: cyr, lat ёки lat-new');
    if (file.buffer.length < 4 || file.buffer[0] !== 0x50 || file.buffer[1] !== 0x4b) throw new BadRequestException('Файл Word (.docx) эмас');
    let out: Buffer;
    try { out = convertDocx(file.buffer, to as Target); } catch { throw new BadRequestException('Файлни ўқиб бўлмади: бузилган Word ҳужжат'); }
    res.attachment(file.originalname.replace(/\.docx$/i, '') + `-${to}.docx`);
    res.send(out);
  }
}
