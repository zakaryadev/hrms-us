import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import Docxtemplater from 'docxtemplater';
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, unlinkSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import PizZip from 'pizzip';
import { detectScript } from '../translit/translit';
import { convertDocx, docxPlainText } from './convert';
import { CUSTOM_TEMPLATE_DIR, DocxService, SCRIPTS } from './docx.service';
import { DOC_TYPES, TEMPLATE_LABEL } from './documents.service';
import type { Lang } from './format';

export type Source = 'custom' | 'bundled' | 'auto';
const isScript = (s: string): s is Lang => (SCRIPTS as readonly string[]).includes(s);

/**
 * Word шаблонлар: ҳар бир шаблондан БИТТА файл юкланади (кирилл ёки лотин — ёзув автоматик аниқланади),
 * қолган ёзувлардаги ҳужжатлар унинг бутун матнини автоматик ўгириб ҳосил қилинади.
 */
@Injectable()
export class TemplatesService {
  constructor(private docx: DocxService) {}

  private prevDir(script: string) { return join(CUSTOM_TEMPLATE_DIR, '_prev', script); }
  private checkName(name: string) {
    if (!(DOC_TYPES as readonly string[]).includes(name)) throw new NotFoundException('Шаблон топилмади');
  }
  /** Юкланган (custom) файллар: одатда биттаси — «асосий» шаблон */
  private customs(name: string) { return SCRIPTS.filter((s) => existsSync(this.docx.customPath(s, name))); }
  private prevOf(name: string) {
    for (const s of SCRIPTS) { const p = join(this.prevDir(s), `${name}.docx`); if (existsSync(p)) return { script: s as Lang, path: p }; }
    return null;
  }

  private fieldsOf(buf: Buffer): string[] {
    try {
      const zip = new PizZip(buf);
      const set = new Set<string>();
      for (const file of Object.keys(zip.files).filter((n) => /^word\/(document|header\d*|footer\d*)\.xml$/.test(n))) {
        const text = zip.file(file)!.asText().replace(/<[^>]+>/g, '');
        for (const m of text.matchAll(/\{\{\s*([^{}]+?)\s*\}\}/g)) set.add(m[1].replace(/^[#/^]\s*/, ''));
      }
      return [...set];
    } catch { return []; }
  }

  list() {
    return DOC_TYPES.map((name) => {
      const customs = this.customs(name);
      const master = customs[0] ?? null;
      const path = master ? this.docx.customPath(master, name) : this.docx.bundledPath('cyr', name);
      if (!existsSync(path)) return null;
      const st = statSync(path);
      const scripts = Object.fromEntries(SCRIPTS.map((t) => {
        const r = this.docx.resolve(t, name);
        const src: Source = !r || r.from !== t ? 'auto' : r.custom ? 'custom' : 'bundled';
        return [t, src];
      })) as Record<Lang, Source>;
      return {
        name, label: TEMPLATE_LABEL[name] ?? name, custom: !!master, masterScript: master, scripts, size: st.size, modifiedAt: st.mtime,
        fields: this.fieldsOf(readFileSync(path)), hasPrevious: !!this.prevOf(name),
      };
    }).filter((x): x is NonNullable<typeof x> => !!x);
  }

  /** Шаблонни керакли ёзувда беради (бошқа ёзувдаги бўлса — бутун матни ўгирилади). original — стандарт шаблон. */
  download(name: string, script: string, original = false) {
    this.checkName(name);
    if (!isScript(script)) throw new NotFoundException('Номаълум ёзув');
    const r = original ? (() => { const from: Lang = script === 'cyr' ? 'cyr' : 'lat'; const path = this.docx.bundledPath(from, name); return existsSync(path) ? { path, from } : null; })() : this.docx.resolve(script, name);
    if (!r) throw new NotFoundException('Шаблон топилмади');
    const raw = readFileSync(r.path);
    return { buffer: r.from === script ? raw : convertDocx(raw, script), name: `${name}-${script}.docx` };
  }

  /** Юкланган ҳужжат ёзувини аниқлайди: статик матндаги кирилл ва лотин ҳарфлар сони */
  private scriptOf(buf: Buffer): Lang {
    const text = docxPlainText(buf);
    let cyr = 0, lat = 0;
    for (const c of text) { if (/[Ѐ-ӿ]/.test(c)) cyr++; else if (/[A-Za-z]/.test(c)) lat++; }
    if (cyr >= lat) return 'cyr';
    return detectScript(text) === 'lat-new' ? 'lat-new' : 'lat';
  }

  /** Янги Word шаблонни юклайди: тузилиши ва {{белгилари}} текширилади; ёзув автоматик аниқланади; олдингиси захирада сақланади. */
  upload(name: string, buf: Buffer, forced?: string) {
    this.checkName(name);
    if (buf.length < 4 || buf[0] !== 0x50 || buf[1] !== 0x4b) throw new BadRequestException('Файл Word (.docx) эмас');
    let zip: PizZip;
    try { zip = new PizZip(buf); } catch { throw new BadRequestException('Файл бузилган ёки Word (.docx) эмас'); }
    if (!zip.file('word/document.xml')) throw new BadRequestException('Файл Word (.docx) ҳужжати эмас');
    try {
      const d = new Docxtemplater(new PizZip(buf), { delimiters: { start: '{{', end: '}}' }, paragraphLoop: true, linebreaks: true, nullGetter: () => '' });
      d.render({});
    } catch (e: any) {
      const errs = e?.properties?.errors as { properties?: { explanation?: string } }[] | undefined;
      throw new BadRequestException(`Шаблонда хато: ${errs?.map((x) => x.properties?.explanation).filter(Boolean).join('; ') || e?.message}`);
    }
    const script: Lang = forced && isScript(forced) ? forced : this.scriptOf(buf);
    const fields = this.fieldsOf(buf);
    const bundled = this.docx.bundledPath('cyr', name);
    const known = new Set(existsSync(bundled) ? this.fieldsOf(readFileSync(bundled)) : []);
    this.stashCurrent(name);
    this.clearCustom(name);
    const path = this.docx.customPath(script, name);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, buf);
    return { name, script, fields, unknownFields: fields.filter((f) => !known.has(f)) };
  }

  /** Жорий асосий шаблонни «олдинги версия» сифатида сақлаб қўяди (биттагина) */
  private stashCurrent(name: string) {
    const cur = this.customs(name)[0];
    if (!cur) return;
    for (const s of SCRIPTS) rmSync(join(this.prevDir(s), `${name}.docx`), { force: true });
    mkdirSync(this.prevDir(cur), { recursive: true });
    copyFileSync(this.docx.customPath(cur, name), join(this.prevDir(cur), `${name}.docx`));
  }
  private clearCustom(name: string) {
    for (const s of SCRIPTS) rmSync(this.docx.customPath(s, name), { force: true });
  }

  /** Юкланган шаблонни ўчириб, стандартига қайтаради (олдинги версия захирада қолади). */
  reset(name: string) {
    this.checkName(name);
    if (!this.customs(name).length) throw new NotFoundException('Бу шаблон стандарт ҳолатда');
    this.stashCurrent(name);
    this.clearCustom(name);
  }

  /** Олдинги юкланган версияни тиклайди (жорий — «олдинги» бўлиб қолади, яна алмаштириш мумкин). */
  restore(name: string) {
    this.checkName(name);
    const prev = this.prevOf(name);
    if (!prev) throw new NotFoundException('Олдинги версия йўқ');
    const keep = readFileSync(prev.path);
    rmSync(prev.path, { force: true });
    this.stashCurrent(name);
    this.clearCustom(name);
    const path = this.docx.customPath(prev.script, name);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, keep);
  }
}
