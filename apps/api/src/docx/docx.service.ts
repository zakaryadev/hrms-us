import { BadRequestException, Injectable } from '@nestjs/common';
import Docxtemplater from 'docxtemplater';
import { existsSync, readFileSync } from 'fs';
import { join, resolve } from 'path';
import PizZip from 'pizzip';
import { Lang } from './format';

export const TEMPLATE_DIR = process.env.TEMPLATE_DIR ?? join(__dirname, '..', '..', 'templates');

/** Foydalanuvchi yuklagan shablonlar (volume'da saqlanadi, standart shablonni bosib o'tadi). */
export const CUSTOM_TEMPLATE_DIR = resolve(process.env.CUSTOM_TEMPLATE_DIR ?? join(process.cwd(), 'templates-custom'));

@Injectable()
export class DocxService {
  bundledPath(lang: string, name: string) { return join(TEMPLATE_DIR, lang, `${name}.docx`); }
  customPath(lang: string, name: string) { return join(CUSTOM_TEMPLATE_DIR, lang, `${name}.docx`); }
  /** Haqiqatda ishlatiladigan fayl: yuklangan bo'lsa o'sha, bo'lmasa standart. */
  effectivePath(lang: string, name: string) { return existsSync(this.customPath(lang, name)) ? this.customPath(lang, name) : this.bundledPath(lang, name); }

  /** Shablon: `templates/<lang>/<name>.docx` (lat — lotin, cyr — kirill); yuklangan shablon ustun */
  render(lang: Lang, templateName: string, data: Record<string, unknown>): Buffer {
    const path = this.effectivePath(lang, templateName);
    if (!existsSync(path)) throw new BadRequestException(`Шаблон топилмади: ${lang}/${templateName}.docx`);
    try {
      const doc = new Docxtemplater(new PizZip(readFileSync(path)), {
        delimiters: { start: '{{', end: '}}' },
        paragraphLoop: true,
        linebreaks: true,
        nullGetter: () => '',
      });
      doc.render(data);
      return doc.getZip().generate({ type: 'nodebuffer', compression: 'DEFLATE' });
    } catch (e: any) {
      const errs = e?.properties?.errors as { properties?: { explanation?: string } }[] | undefined;
      const detail = errs?.map((x) => x.properties?.explanation).filter(Boolean).join('; ') || e?.message;
      throw new BadRequestException(`Шаблонни тўлдиришда хато (${lang}/${templateName}): ${detail}`);
    }
  }
}
