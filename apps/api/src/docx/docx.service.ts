import { BadRequestException, Injectable } from '@nestjs/common';
import Docxtemplater from 'docxtemplater';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import PizZip from 'pizzip';

export const TEMPLATE_DIR = process.env.TEMPLATE_DIR ?? join(__dirname, '..', '..', 'templates');

@Injectable()
export class DocxService {
  render(templateName: string, data: Record<string, unknown>): Buffer {
    const path = join(TEMPLATE_DIR, `${templateName}.docx`);
    if (!existsSync(path)) throw new BadRequestException(`Shablon topilmadi: ${templateName}.docx`);
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
      throw new BadRequestException(`Shablonni to'ldirishda xato (${templateName}): ${detail}`);
    }
  }
}
