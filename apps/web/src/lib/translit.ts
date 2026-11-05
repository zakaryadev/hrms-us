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
export interface Options {
  apostrophe?: Apostrophe;
  /** Кирилга ўгирилганда қўштирноқ ичидаги лотин ном (бренд, сайт: “UNICON-SOFT”, “Ijro.gov.uz”) ўзгартирилмайди */
  protectQuotedLatin?: boolean;
  /** {{майдон}} белгилари (шаблон ичидаги) ўзгартирилмайди */
  protectTags?: boolean;
}
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

/** Ҳарф + у қайси бошланғич ҳарфдан ҳосил бўлгани (DOCX матн бўлаклари форматини сақлаш учун) */
interface Cell { c: string; src: number }
const toCells = (text: string): Cell[] => [...text].map((c, src) => ({ c, src }));
/** Кўп ҳарфли натижани ҳарфларга ёради (ҳар бири ўша src билан) — кейинги босқич битта ҳарфдан ишлайди */
const expand = (cells: Cell[]): Cell[] => cells.flatMap((x) => ([...x.c].length === 1 ? [x] : [...x.c].map((c) => ({ c, src: x.src }))));

/** Кўп ҳарфли натижада катта-кичик ҳарф: «Ш»→«Sh», «ШАХАР»→«SHAXAR» */
function caseLike(src: string, out: string, prev: string | undefined, next: string | undefined): string {
  if (!out) return out;
  if (!isUpper(src)) return out;
  if (out.length === 1) return out.toUpperCase();
  return isUpper(prev) || isUpper(next) ? out.toUpperCase() : out[0].toUpperCase() + out.slice(1);
}

/** Кирилл ҳарфлар → эски лотин (бошқа белгилар ўзгармайди) */
function cyrToLat(cells: Cell[]): Cell[] {
  const out: Cell[] = [];
  for (let i = 0; i < cells.length; i++) {
    const c = cells[i].c, l = lower(c), prev = cells[i - 1]?.c, next = cells[i + 1]?.c;
    const wordStart = !isLetter(prev);
    const pl = lower(prev);
    let r: string | undefined;
    if (l === 'е') r = wordStart || CYR_VOWELS.includes(pl) || pl === 'ъ' || pl === 'ь' ? 'ye' : 'e';
    else if (l === 'ц') r = wordStart || !CYR_VOWELS.includes(pl) ? 's' : 'ts';
    else r = CYR2LAT[l];
    out.push({ c: r === undefined ? c : caseLike(c, r, prev, next), src: cells[i].src });
  }
  return out;
}

/** Янги алифбо ҳарфлари → эски лотин рақамлари: Ş→Sh, Ç→Ch, Ö→Oʻ, Ğ→Gʻ */
function newToOld(cells: Cell[]): Cell[] {
  const MAP: Record<string, string> = { ş: 'sh', ç: 'ch', ö: 'o' + TURN, ğ: 'g' + TURN };
  return cells.map((x, i) => {
    const l = x.c === 'Ş' ? 'ş' : x.c === 'Ç' ? 'ç' : x.c === 'Ö' ? 'ö' : x.c === 'Ğ' ? 'ğ' : x.c;
    const r = MAP[l];
    if (!r) return x;
    return { c: x.c === l ? r : caseLike('A', r, cells[i - 1]?.c, cells[i + 1]?.c), src: x.src };
  });
}

/** Апостроф ўхшаш белгилар: o/g дан кейин — ʻ (oʻ, gʻ), бошқа ҳолда — тутуқ ʼ */
function normalizeApostrophes(cells: Cell[]): Cell[] {
  return cells.map((x, i) => (APOS.test(x.c) ? { c: /[oOgG]/.test(cells[i - 1]?.c ?? '') ? TURN : TUTUQ, src: x.src } : x));
}

/** Эски лотин → кирилл (ички шаклдаги ʻ ва ʼ билан) */
function latToCyr(cells: Cell[]): Cell[] {
  const out: Cell[] = [];
  const DI: [string, string][] = [['sh', 'ш'], ['ch', 'ч'], ['ng', 'нг'], ['yo', 'ё'], ['yu', 'ю'], ['ya', 'я'], ['ye', 'е'], ['ts', 'ц'], ['o' + TURN, 'ў'], ['g' + TURN, 'ғ']];
  const ONE: Record<string, string> = {
    a: 'а', b: 'б', d: 'д', f: 'ф', g: 'г', h: 'ҳ', i: 'и', j: 'ж', k: 'к', l: 'л', m: 'м', n: 'н', o: 'о', p: 'п', q: 'қ', r: 'р',
    s: 'с', t: 'т', u: 'у', v: 'в', w: 'в', x: 'х', y: 'й', z: 'з', c: 'ц', [TUTUQ]: 'ъ', [TURN]: 'ъ',
  };
  for (let i = 0; i < cells.length; ) {
    const c = cells[i].c, src = cells[i].src;
    const two = (c + (cells[i + 1]?.c ?? '')).toLowerCase();
    const di = DI.find(([k]) => k === two);
    if (di) {
      const prev = cells[i - 1]?.c, next = cells[i + 2]?.c;
      let r = caseLike(c, di[1], prev, next);
      // «SH», «NG» каби ҳарф-ҳарф катта ёзилган бирикма
      if (isUpper(c) && isUpper(cells[i + 1]?.c)) r = di[1].toUpperCase();
      out.push({ c: r, src });
      i += 2; continue;
    }
    const l = lower(c), prev = cells[i - 1]?.c, next = cells[i + 1]?.c;
    if (l === 'e') {
      const startOrVowel = !isLetter(prev) && prev !== TURN && prev !== TUTUQ ? true : LAT_VOWELS.includes(lower(prev));
      out.push({ c: caseLike(c, startOrVowel ? 'э' : 'е', prev, next), src });
    } else if (c === TUTUQ || c === TURN) {
      // тутуқ катта ҳарфли сўз ичида катта «Ъ» бўлади: МАЪЛУМОТ
      out.push({ c: isUpper(prev) && isUpper(next) ? 'Ъ' : 'ъ', src });
    } else if (ONE[l] !== undefined) out.push({ c: caseLike(c, ONE[l], prev, next), src });
    else out.push(cells[i]);
    i++;
  }
  return out;
}

/** Эски лотин → янги алифбо: sh→ş, ch→ç, oʻ→ö, gʻ→ğ */
function oldToNew(cells: Cell[]): Cell[] {
  const out: Cell[] = [];
  for (let i = 0; i < cells.length; ) {
    const c = cells[i].c, l = lower(c), n = lower(cells[i + 1]?.c), src = cells[i].src;
    const up = isUpper(c);
    if (l === 's' && n === 'h') { out.push({ c: up ? 'Ş' : 'ş', src }); i += 2; continue; }
    if (l === 'c' && n === 'h') { out.push({ c: up ? 'Ç' : 'ç', src }); i += 2; continue; }
    if (l === 'o' && cells[i + 1]?.c === TURN) { out.push({ c: up ? 'Ö' : 'ö', src }); i += 2; continue; }
    if (l === 'g' && cells[i + 1]?.c === TURN) { out.push({ c: up ? 'Ğ' : 'ğ', src }); i += 2; continue; }
    out.push(cells[i]); i++;
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

function convert(text: string, to: Target): Cell[] {
  let cells = expand(toCells(text));
  cells = expand(newToOld(cells));                       // янги алифбо ҳарфлари аввал эски лотинга келтирилади
  if (to === 'cyr') return expand(latToCyr(expand(normalizeApostrophes(cells))));
  cells = expand(normalizeApostrophes(expand(cyrToLat(cells))));
  return to === 'lat-new' ? expand(oldToNew(cells)) : cells;
}

/** Ўгирилмайдиган оралиқлар: қўштирноқ ичидаги соф лотин матн (бренд/сайт номи) ва {{майдон}} белгилари */
function protectedMask(text: string, quoted: boolean, tags: boolean): boolean[] {
  const chars = [...text];
  const mask = chars.map(() => false);
  if (tags) {
    const tre = /\{\{[^}]*\}\}/g;
    let t: RegExpExecArray | null;
    while ((t = tre.exec(text)) !== null) {
      const from = [...text.slice(0, t.index)].length, len = [...t[0]].length;
      for (let k = 0; k < len; k++) mask[from + k] = true;
    }
  }
  if (!quoted) return mask;
  const re = /[“«"]([^”»"]*)[”»"]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(chars.join(''))) !== null) {
    const inner = m[1];
    if (!/[A-Za-z]/.test(inner) || /[Ѐ-ӿ]/.test(inner)) continue;
    // m.index — UTF-16 бўйича; ҳарф индексига ўтказамиз
    const startCp = [...chars.join('').slice(0, m.index + 1)].length;
    const len = [...inner].length;
    for (let k = 0; k < len; k++) mask[startCp + k] = true;
  }
  return mask;
}

/**
 * Матнни ўгириб, НАТИЖАНИ ҲАР БИР БОШЛАНҒИЧ ҲАРФ БЎЙИЧА қайтаради (индекс — кодпоинт). Бу DOCX да матн бўлаклари (run)
 * ўз форматини сақлаб қолиши учун керак: pieces.slice(a, b).join('') — бошланғич матннинг [a, b) қисми натижаси.
 */
export function transliteratePieces(text: string, to: Target, opts: Options = {}): string[] {
  const apos: Apostrophe = opts.apostrophe ?? 'modifier';
  const chars = [...text];
  const pieces: string[] = chars.map(() => '');
  const quoted = to === 'cyr' && !!opts.protectQuotedLatin;
  const mask = quoted || opts.protectTags ? protectedMask(text, quoted, !!opts.protectTags) : chars.map(() => false);
  // ҳимояланмаган ораликлар алоҳида ўгирилади (контекст чегарада узилади)
  for (let i = 0; i < chars.length; ) {
    if (mask[i]) { pieces[i] = chars[i]; i++; continue; }
    let j = i;
    while (j < chars.length && !mask[j]) j++;
    for (const x of convert(chars.slice(i, j).join(''), to)) pieces[i + x.src] += x.c;
    i = j;
  }
  return pieces.map((p) => formatApostrophes(p, apos));
}

/** Матнни керакли ёзувга ўгиради. Манба ёзув ҳарф-ҳарф аниқланади (аралаш матн ҳам ишлайди). */
export function transliterate(text: string, to: Target, opts: Options = {}): string {
  return transliteratePieces(text, to, opts).join('');
}
