import { BadRequestException, Injectable } from '@nestjs/common';
import Docxtemplater from 'docxtemplater';
import { existsSync, readFileSync } from 'fs';
import { join, resolve } from 'path';
import PizZip from 'pizzip';
import { convertDocx } from './convert';
import { Lang } from './format';

export const TEMPLATE_DIR = process.env.TEMPLATE_DIR ?? join(__dirname, '..', '..', 'templates');

/** Foydalanuvchi yuklagan shablonlar (volume'da saqlanadi, standart shablonni bosib o'tadi). */
export const CUSTOM_TEMPLATE_DIR = resolve(process.env.CUSTOM_TEMPLATE_DIR ?? join(process.cwd(), 'templates-custom'));

export const SCRIPTS = ['cyr', 'lat', 'lat-new'] as const;

@Injectable()
export class DocxService {
  /** Стандарт шаблонлар фақат кирилл ва лотин (1995) да; янги алифбо ўгириш орқали ҳосил бўлади */
  bundledPath(script: string, name: string) { return join(TEMPLATE_DIR, script === 'cyr' ? 'cyr' : 'lat', `${name}.docx`); }
  customPath(script: string, name: string) { return join(CUSTOM_TEMPLATE_DIR, script, `${name}.docx`); }

  /**
   * Сўралган ёзув учун шаблон: 1) шу ёзувда юкланган; 2) бошқа ёзувда юкланган (ҳужжат охирида АВТОМАТИК ўгирилади);
   * 3) стандарт (лотин/кирилл; янги алифбо учун лотиндан ўгирилади).
   */
  resolve(lang: Lang, name: string): { path: string; from: Lang; custom: boolean } | null {
    for (const from of [lang, 'lat', 'cyr', 'lat-new'] as Lang[]) {
      const path = this.customPath(from, name);
      if (existsSync(path)) return { path, from, custom: true };
    }
    const from: Lang = lang === 'cyr' ? 'cyr' : 'lat';
    const path = this.bundledPath(from, name);
    return existsSync(path) ? { path, from, custom: false } : null;
  }

  /** Шаблонни тўлдиради. Шаблон бошқа ёзувда бўлса, тайёр ҳужжатнинг БУТУН матни (шаблон матни ҳам, маълумот ҳам) керакли ёзувга ўгирилади. */
  render(lang: Lang, templateName: string, data: Record<string, unknown>, extra: { photo?: Buffer } = {}): Buffer {
    const found = this.resolve(lang, templateName);
    if (!found) throw new BadRequestException(`Шаблон топилмади: ${templateName}.docx`);
    const path = found.path;
    try {
      const doc = new Docxtemplater(new PizZip(readFileSync(path)), {
        delimiters: { start: '{{', end: '}}' },
        paragraphLoop: true,
        linebreaks: true,
        nullGetter: () => '',
      });
      doc.render(data);
      const zip = doc.getZip();
      if (extra.photo) applyPhoto(zip, extra.photo);
      const out = zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' });
      return found.from === lang ? out : convertDocx(out, lang);
    } catch (e: any) {
      const errs = e?.properties?.errors as { properties?: { explanation?: string } }[] | undefined;
      const detail = errs?.map((x) => x.properties?.explanation).filter(Boolean).join('; ') || e?.message;
      throw new BadRequestException(`Шаблонни тўлдиришда хато (${lang}/${templateName}): ${detail}`);
    }
  }
}

/** PNG/JPEG бошидан ўлчамни ўқийди (қўшимча кутубхонасиз). */
export function imageInfo(b: Buffer): { ext: 'png' | 'jpg'; w: number; h: number } | null {
  if (b.length > 24 && b.readUInt32BE(0) === 0x89504e47) return { ext: 'png', w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
  if (b.length > 4 && b[0] === 0xff && b[1] === 0xd8) {
    let i = 2;
    while (i + 9 < b.length) {
      if (b[i] !== 0xff) { i++; continue; }
      const m = b[i + 1];
      if (m >= 0xc0 && m <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(m)) return { ext: 'jpg', h: b.readUInt16BE(i + 5), w: b.readUInt16BE(i + 7) };
      i += 2 + b.readUInt16BE(i + 2);
    }
  }
  return null;
}

/**
 * Шаблондаги фото ўрнини (биринчи расм) ходим расми билан алмаштиради: расм рамка нисбатига кўра
 * марказдан қирқилади (cузилмайди). Расм ўқилмаса — шаблондаги рамка қолади.
 */
export function applyPhoto(zip: PizZip, photo: Buffer) {
  const info = imageInfo(photo);
  const docFile = zip.file('word/document.xml'); const relsFile = zip.file('word/_rels/document.xml.rels');
  if (!info || !info.w || !info.h || !docFile || !relsFile) return;
  let xml = docFile.asText();
  const blip = /<a:blip [^>]*r:embed="(rId\d+)"/.exec(xml);
  if (!blip) return;
  // шу расмни ўраб турган anchor/inline блокидаги ўлчам
  const block = xml.slice(0, blip.index).split(/<wp:(?:anchor|inline)\b/).pop() ?? '';
  const ext = /<wp:extent cx="(\d+)" cy="(\d+)"/.exec(block);
  if (!ext) return;
  const frame = Number(ext[1]) / Number(ext[2]), ratio = info.w / info.h;
  const pct = (f: number) => Math.max(0, Math.round(f * 100000));
  const crop = ratio > frame ? { l: pct((1 - frame / ratio) / 2), r: pct((1 - frame / ratio) / 2), t: 0, b: 0 }
    : { l: 0, r: 0, t: pct((1 - ratio / frame) / 2), b: pct((1 - ratio / frame) / 2) };
  const name = `media/photo.${info.ext}`;
  zip.file(`word/${name}`, photo);
  let rels = relsFile.asText();
  rels = rels.replace(new RegExp(`(Id="${blip[1]}"[^>]*Target=")[^"]+(")`), `$1${name}$2`).replace(new RegExp(`(Target=")[^"]+("[^>]*Id="${blip[1]}")`), `$1${name}$2`);
  zip.file('word/_rels/document.xml.rels', rels);
  xml = xml.replace(/<a:srcRect\s*\/>/, `<a:srcRect l="${crop.l}" t="${crop.t}" r="${crop.r}" b="${crop.b}"/>`);
  zip.file('word/document.xml', xml);
  const ct = zip.file('[Content_Types].xml')!.asText();
  const mime = info.ext === 'jpg' ? 'image/jpeg' : 'image/png';
  if (!new RegExp(`Extension="${info.ext}"`, 'i').test(ct)) zip.file('[Content_Types].xml', ct.replace('<Default ', `<Default Extension="${info.ext}" ContentType="${mime}"/><Default `));
}
