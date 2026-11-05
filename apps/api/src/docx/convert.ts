import { DOMParser, XMLSerializer } from '@xmldom/xmldom';
import PizZip from 'pizzip';
import { transliteratePieces, type Options, type Target } from '../translit/translit';

const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const PARTS = /^word\/(document|footnotes|endnotes|header\d*|footer\d*)\.xml$/;

/** Абзацнинг ўзига тегишли w:t элементлари (ичма-ич абзацлар — матн қутилари — алоҳида ишланади) */
function ownTexts(p: any): any[] {
  const out: any[] = [];
  const walk = (n: any) => {
    for (let c = n.firstChild; c; c = c.nextSibling) {
      if (c.nodeType !== 1) continue;
      const el = c;
      if (el.namespaceURI === W && el.localName === 'p') continue;       // ичма-ич абзац
      if (el.namespaceURI === W && el.localName === 't') out.push(el);
      else walk(el);
    }
  };
  walk(p);
  return out;
}

function convertXml(xml: string, to: Target, opts: Options): string {
  const doc = new DOMParser().parseFromString(xml, 'text/xml');
  const paras = doc.getElementsByTagNameNS(W, 'p');
  for (let i = 0; i < paras.length; i++) {
    const ts = ownTexts(paras[i]);
    if (!ts.length) continue;
    const texts = ts.map((t) => t.textContent ?? '');
    const joined = texts.join('');
    if (!/[A-Za-zЀ-ӿşçöğŞÇÖĞ'‘’ʻʼ`]/.test(joined)) continue;     // рақам/белгилар — ўзгармайди
    // Бутун абзац бирданига ўгирилади (сўз бўлакларга бўлинган бўлса ҳам контекст сақланади), сўнг ҳар бир w:t ўз улушини олади
    const pieces = transliteratePieces(joined, to, opts);
    let at = 0;
    ts.forEach((t, k) => {
      const len = [...texts[k]].length;
      const text = pieces.slice(at, at + len).join('');
      at += len;
      if (text === texts[k]) return;
      t.textContent = text;
      if (/^\s|\s$/.test(text)) t.setAttributeNS('http://www.w3.org/XML/1998/namespace', 'xml:space', 'preserve');
    });
  }
  return new XMLSerializer().serializeToString(doc);
}

/**
 * Word (.docx) ҳужжатнинг БУТУН матнини (асосий қисм, жадваллар, матн қутилари, юқори/пастки колонтитул, изоҳлар)
 * кирилл / лотин / янги алифбога ўгиради. Форматлаш, расм ва жадваллар ўзгармайди; {{майдон}} белгилари сақланади.
 */
export function convertDocx(buf: Buffer, to: Target, opts: Options = {}): Buffer {
  const zip = new PizZip(buf);
  const o: Options = { protectQuotedLatin: true, protectTags: true, ...opts };
  for (const name of Object.keys(zip.files)) {
    if (!PARTS.test(name)) continue;
    zip.file(name, convertXml(zip.file(name)!.asText(), to, o));
  }
  // тил белгиси: uz-Cyrl-UZ ⇄ uz-Latn-UZ
  const lang = to === 'cyr' ? 'uz-Cyrl-UZ' : 'uz-Latn-UZ', other = to === 'cyr' ? 'uz-Latn-UZ' : 'uz-Cyrl-UZ';
  for (const name of Object.keys(zip.files)) {
    if (!/^word\/[^/]+\.xml$/.test(name)) continue;
    const x = zip.file(name)!.asText();
    if (x.includes(other)) zip.file(name, x.split(other).join(lang));
  }
  return zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' });
}

/** Ҳужжатнинг статик матни (тегларсиз, {{майдонлар}}сиз) — ёзувни аниқлаш учун */
export function docxPlainText(buf: Buffer): string {
  const zip = new PizZip(buf);
  const out: string[] = [];
  for (const name of Object.keys(zip.files)) {
    if (!PARTS.test(name)) continue;
    out.push(zip.file(name)!.asText().replace(/<[^>]+>/g, ''));
  }
  return out.join(' ').replace(/\{\{[^}]*\}\}/g, ' ');
}
