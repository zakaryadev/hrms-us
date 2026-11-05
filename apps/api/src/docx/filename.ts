import { transliterate } from '../translit/translit';

export interface NamedEmployee {
  tabNumber: string;
  lastName: string;
  firstName: string;
  middleName?: string | null;
  department?: { name: string } | null;
  position?: { title: string } | null;
}

const latin = (s: string) => transliterate(s, 'lat', { apostrophe: 'none' });
/** Ҳарф/рақам/чизиқчадан бошқа ҳамма нарса «_» га айланади */
const slug = (s: string) => latin(s).replace(/[^\p{L}\p{N}-]+/gu, '_').replace(/^_+|_+$/g, '');

/**
 * DOCX файл номи (Т-2 учун шу шакл, бошқа ҳужжатларга тури ва рақами қўшилади):
 *   12_Muratbayev_Zakarya_Baxtiyar_uli_“Ijro_gov_uz”_menejer.docx
 *   └ табель № · Ф.И.Ш. (лотин) · бўлимдаги «қўштирноқ» номи · лавозимнинг сўнгги сўзи
 */
export function docFileName(type: string, e: NamedEmployee, number?: string | null): string {
  const fio = [e.lastName, e.firstName, e.middleName].filter(Boolean).map((w) => slug(String(w))).filter(Boolean).join('_');
  const quoted = /[“"«]([^”"»]{1,60})[”"»]/.exec(e.department?.name ?? '')?.[1];
  const sector = quoted ? `“${slug(quoted)}”` : '';
  const posWords = (e.position?.title ?? '').trim().split(/\s+/).filter(Boolean);
  const position = posWords.length ? slug(posWords[posWords.length - 1]).toLowerCase() : '';
  const kind = type === 'obyektivka' ? '' : [type, number ? slug(number) : ''].filter(Boolean).join('-');
  const name = [slug(e.tabNumber), fio, sector, position, kind].filter(Boolean).join('_')
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '');
  return `${name.slice(0, 180)}.docx`;
}
