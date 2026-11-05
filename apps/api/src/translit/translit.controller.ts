import { Body, Controller, Post } from '@nestjs/common';
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
}
