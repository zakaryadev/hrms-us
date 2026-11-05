/**
 * Ўзбек транслитератори: кирилл ⇄ лотин (1995) ⇄ янги лотин алифбоси.
 *
 * Янги алифбо (2026 йил 21 октябрда имзоланган қонун): Oʻ→Ö, Gʻ→Ğ, Sh→Ş, Ch→Ç; «ng» алоҳида ҳарф эмас
 * (алифбо 28 ҳарф + тутуқ белгиси). Қолган ҳарфлар 1995 йилдаги лотин ёзуви билан бир хил.
 *
 * Ички шакл — «эски лотин»: oʻ/gʻ учун ʻ (U+02BB), тутуқ (ъ) учун ʼ (U+02BC).
 */
export type Target = 'cyr' | 'lat' | 'lat-new';
export type Apostrophe = 'modifier' | 'ascii' | 'none';
export interface Options { apostrophe?: Apostrophe }
export type Script = 'cyr' | 'lat' | 'lat-new' | 'mixed' | 'none';

const TURN = 'ʻ';   // ʻ  — oʻ, gʻ
const TUTUQ = 'ʼ';  // ʼ  — тутуқ белгиси (ъ)
const APOS = /['‘’ʻʼ`´ʹ`]/;

const CYR_VOWELS = 'аеёиоуўэюяыәөү';
const LAT_VOWELS = 'aeiou';
const isLetter = (c: string | undefined) => !!c && c.toLowerCase() !== c.toUpperCase();
const isUpper = (c: string | undefined) => isLetter(c) && c === c!.toUpperCase();
const lower = (c: string | undefined) => (c ?? '').toLowerCase();

const CYR2LAT: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', ж: 'j', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r',
  с: 's', т: 't', у: 'u', ф: 'f', х: 'x', ч: 'ch', ш: 'sh', щ: 'shch', ъ: TUTUQ, ы: 'i', ь: '', э: 'e', ю: 'yu', я: 'ya', ё: 'yo',
  ў: 'o' + TURN, қ: 'q', ғ: 'g' + TURN, ҳ: 'h',
  // Қорақалпоқча қўшимча ҳарфлар
  ң: 'ng', ә: 'a', ө: 'o' + TURN, ү: 'u',
};

/** Кўп ҳарфли натижада катта-кичик ҳарф: «Ш»→«Sh», «ШАХАР»→«SHAXAR» */
function caseLike(src: string, out: string, prev: string | undefined, next: string | undefined): string {
  if (!out) return out;
  if (!isUpper(src)) return out;
  if (out.length === 1) return out.toUpperCase();
  return isUpper(prev) || isUpper(next) ? out.toUpperCase() : out[0].toUpperCase() + out.slice(1);
}

/** Кирилл ҳарфлар → эски лотин (бошқа белгилар ўзгармайди) */
function cyrToLat(text: string): string {
  const chars = [...text];
  let out = '';
  for (let i = 0; i < chars.length; i++) {
    const c = chars[i], l = lower(c), prev = chars[i - 1], next = chars[i + 1];
    const wordStart = !isLetter(prev) || prev === undefined;
    const pl = lower(prev);
    let r: string | undefined;
    if (l === 'е') r = wordStart || CYR_VOWELS.includes(pl) || pl === 'ъ' || pl === 'ь' ? 'ye' : 'e';
    else if (l === 'ц') r = wordStart || !CYR_VOWELS.includes(pl) ? 's' : 'ts';
    else r = CYR2LAT[l];
    if (r === undefined) { out += c; continue; }
    out += caseLike(c, r, prev, next);
  }
  return out;
}

/** Янги алифбо ҳарфлари → эски лотин рақамлари: Ş→Sh, Ç→Ch, Ö→Oʻ, Ğ→Gʻ */
function newToOld(text: string): string {
  const chars = [...text];
  let out = '';
  const MAP: Record<string, string> = { ş: 'sh', ç: 'ch', ö: 'o' + TURN, ğ: 'g' + TURN };
  for (let i = 0; i < chars.length; i++) {
    const c = chars[i], l = c === 'Ş' ? 'ş' : c === 'Ç' ? 'ç' : c === 'Ö' ? 'ö' : c === 'Ğ' ? 'ğ' : c;
    const r = MAP[l];
    if (!r) { out += c; continue; }
    out += c === l ? r : caseLike('A', r, chars[i - 1], chars[i + 1]);
  }
  return out;
}

/** Апостроф ўхшаш белгилар: o/g дан кейин — ʻ (oʻ, gʻ), бошқа ҳолда — тутуқ ʼ */
function normalizeApostrophes(text: string): string {
  const chars = [...text];
  return chars.map((c, i) => (APOS.test(c) ? (/[oOgG]/.test(chars[i - 1] ?? '') ? TURN : TUTUQ) : c)).join('');
}

/** Эски лотин → кирилл (ички шаклдаги ʻ ва ʼ билан) */
function latToCyr(text: string): string {
  const s = [...text];
  let out = '';
  const DI: [string, string][] = [['sh', 'ш'], ['ch', 'ч'], ['ng', 'нг'], ['yo', 'ё'], ['yu', 'ю'], ['ya', 'я'], ['ye', 'е'], ['ts', 'ц'], ['o' + TURN, 'ў'], ['g' + TURN, 'ғ']];
  const ONE: Record<string, string> = {
    a: 'а', b: 'б', d: 'д', f: 'ф', g: 'г', h: 'ҳ', i: 'и', j: 'ж', k: 'к', l: 'л', m: 'м', n: 'н', o: 'о', p: 'п', q: 'қ', r: 'р',
    s: 'с', t: 'т', u: 'у', v: 'в', w: 'в', x: 'х', y: 'й', z: 'з', c: 'ц', [TUTUQ]: 'ъ', [TURN]: 'ъ',
  };
  for (let i = 0; i < s.length; ) {
    const c = s[i];
    const two = (c + (s[i + 1] ?? '')).toLowerCase();
    const di = DI.find(([k]) => k === two);
    if (di) {
      const next = s[i + 2], prev = s[i - 1];
      out += caseLike(c, di[1], prev, next ?? undefined);
      // «SH», «NG» каби ҳарф-ҳарф катта ёзилган бирикма
      if (isUpper(c) && isUpper(s[i + 1]) && di[1].length === 1) out = out.slice(0, -1) + di[1].toUpperCase();
      i += 2; continue;
    }
    const l = lower(c);
    if (l === 'e') {
      const pl = lower(s[i - 1]);
      const startOrVowel = !isLetter(s[i - 1]) && s[i - 1] !== TURN && s[i - 1] !== TUTUQ ? true : LAT_VOWELS.includes(pl);
      out += caseLike(c, startOrVowel ? 'э' : 'е', s[i - 1], s[i + 1]);
    } else if (ONE[l] !== undefined) out += caseLike(c, ONE[l], s[i - 1], s[i + 1]);
    else out += c;
    i++;
  }
  return out;
}

/** Эски лотин → янги алифбо: sh→ş, ch→ç, oʻ→ö, gʻ→ğ */
function oldToNew(text: string): string {
  const s = [...text];
  let out = '';
  for (let i = 0; i < s.length; ) {
    const c = s[i], l = lower(c), n = lower(s[i + 1]);
    const up = isUpper(c);
    if (l === 's' && n === 'h') { out += up ? 'Ş' : 'ş'; i += 2; continue; }
    if (l === 'c' && n === 'h') { out += up ? 'Ç' : 'ç'; i += 2; continue; }
    if (l === 'o' && s[i + 1] === TURN) { out += up ? 'Ö' : 'ö'; i += 2; continue; }
    if (l === 'g' && s[i + 1] === TURN) { out += up ? 'Ğ' : 'ğ'; i += 2; continue; }
    out += c; i++;
  }
  return out;
}

function formatApostrophes(text: string, mode: Apostrophe): string {
  if (mode === 'modifier') return text;
  return text.replace(new RegExp(`[${TURN}${TUTUQ}]`, 'g'), mode === 'ascii' ? "'" : '');
}

/** Матннинг асосий ёзувини аниқлайди */
export function detectScript(text: string): Script {
  let cyr = 0, lat = 0, neu = 0;
  for (const c of text) {
    if (/[Ѐ-ӿ]/.test(c)) cyr++;
    else if (/[şçöğŞÇÖĞ]/.test(c)) { neu++; lat++; }
    else if (/[A-Za-z]/.test(c)) lat++;
  }
  if (!cyr && !lat) return 'none';
  if (cyr && lat) return 'mixed';
  if (cyr) return 'cyr';
  return neu ? 'lat-new' : 'lat';
}

/** Матнни керакли ёзувга ўгиради. Манба ёзув ҳарф-ҳарф аниқланади (аралаш матн ҳам ишлайди). */
export function transliterate(text: string, to: Target, opts: Options = {}): string {
  const apos: Apostrophe = opts.apostrophe ?? 'modifier';
  if (to === 'cyr') return latToCyr(normalizeApostrophes(newToOld(text)));
  // лотин: кирилл ва янги ҳарфларни эски лотинга келтирамиз
  const old = normalizeApostrophes(cyrToLat(newToOld(text)));
  return formatApostrophes(to === 'lat-new' ? oldToNew(old) : old, apos);
}
