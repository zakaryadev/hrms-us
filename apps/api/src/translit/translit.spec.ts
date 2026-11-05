import { detectScript, transliterate as t } from './translit';

describe('transliterator', () => {
  const O = 'ʻ', T = 'ʼ';
  describe('кирилл → лотин', () => {
    it.each([
      ['Муратбаев Закарья Бахтияр улы', 'Muratbayev Zakarya Baxtiyar uli'],
      ['Ўзбекистон', `O${O}zbekiston`],
      ['Ғулом Қодиров', `G${O}ulom Qodirov`],
      ['Шаҳар', 'Shahar'],
      ['ШАХАР ЧОРСУ', 'SHAXAR CHORSU'],
      ['Еримкулова Гоззал Жанназаровна', 'Yerimkulova Gozzal Jannazarovna'],
      ['Алиев', 'Aliyev'],
      ['Цирк, станция', 'Sirk, stansiya'],
      ['Объект', `Ob${T}yekt`],
      ['Щербаков', 'Shcherbakov'],
      ['Эшон ёзув юлдуз яхши', 'Eshon yozuv yulduz yaxshi'],
      ['13.10.2003 — №5', '13.10.2003 — №5'],
    ])('%s', (src, exp) => expect(t(src, 'lat')).toBe(exp));
  });

  describe('лотин → кирилл', () => {
    it.each([
      [`O${O}zbekiston`, 'Ўзбекистон'],
      ["O'zbekiston, g'uzor, to'g'ri", 'Ўзбекистон, ғузор, тўғри'],
      ['Toshkent shahri', 'Тошкент шаҳри'],
      ['Muratbayev Baxtiyar', 'Муратбаев Бахтияр'],
      ['Eshon, Sherzod, Elmira', 'Эшон, Шерзод, Элмира'],
      ["Ma'no, sa'y", 'Маъно, саъй'],
      ['SHAHAR CHORSU', 'ШАҲАР ЧОРСУ'],
      ['Yangi yil, yoz, yuz', 'Янги йил, ёз, юз'],
      ['Ming, tong, ongli', 'Минг, тонг, онгли'],
    ])('%s', (src, exp) => expect(t(src, 'cyr')).toBe(exp));
  });

  describe('янги алифбо (Ş Ç Ö Ğ)', () => {
    it('лотин → янги', () => {
      expect(t(`Toshkent shahri, o${O}zbek, g${O}oya, chiroyli`, 'lat-new')).toBe('Toşkent şahri, özbek, ğoya, çiroyli');
      expect(t("O'ZBEKISTON SHAHAR", 'lat-new')).toBe('ÖZBEKISTON ŞAHAR');
      expect(t('Ng yoki ng', 'lat-new')).toBe('Ng yoki ng');   // «ng» ҳарф эмас — ўзгармайди
    });
    it('кирилл → янги', () => {
      expect(t('Ўзбекистон Шаҳар Чорсу Ғузор', 'lat-new')).toBe('Özbekiston Şahar Çorsu Ğuzor');
    });
    it('янги → эски лотин ва кирилл', () => {
      expect(t('Özbekiston Şahar Çorsu Ğuzor', 'lat')).toBe(`O${O}zbekiston Shahar Chorsu G${O}uzor`);
      expect(t('Özbekiston Şahar Çorsu Ğuzor', 'cyr')).toBe('Ўзбекистон Шаҳар Чорсу Ғузор');
      expect(t('ŞAHAR', 'lat')).toBe('SHAHAR');
    });
  });

  it('апостроф шакллари: ASCII ва олиб ташлаш', () => {
    expect(t('Ўзбекистон, объект', 'lat', { apostrophe: 'ascii' })).toBe("O'zbekiston, ob'yekt");
    expect(t('Ўзбекистон, объект', 'lat', { apostrophe: 'none' })).toBe('Ozbekiston, obyekt');
  });

  it('турли апостроф белгилари бир хил кирилл беради', () => {
    for (const a of ["'", '‘', '’', 'ʻ', 'ʼ', '`']) expect(t(`to${a}g${a}ri`, 'cyr')).toBe('тўғри');
  });

  it('ўз-ўзига қайтиш: исмлар кирилл → лотин → кирилл', () => {
    for (const n of ['Муратбаев Бахтияр', 'Қодиров Ғулом Ўткир ўғли', 'Шаҳло Раҳимова', 'Тошкент шаҳри', 'Бердибаев Бахтияр Муратбаевич', 'Юсупов Эшмат'])
      expect(t(t(n, 'lat'), 'cyr')).toBe(n);
    expect(t(t('Закарья', 'lat'), 'cyr')).toBe('Закаря');   // ь лотинда йўқолади — маълум чекловлар
  });

  it('аралаш матн ва бўш қийматлар', () => {
    expect(t('Ali Али', 'lat')).toBe('Ali Ali');
    expect(t('Ali Али', 'cyr')).toBe('Али Али');
    expect(t('', 'cyr')).toBe('');
  });

  it('ёзувни аниқлаш', () => {
    expect(detectScript('Салом')).toBe('cyr');
    expect(detectScript('Salom')).toBe('lat');
    expect(detectScript('Özbek')).toBe('lat-new');
    expect(detectScript('Salom Салом')).toBe('mixed');
    expect(detectScript('123 .,')).toBe('none');
  });
});

// Веб (apps/web/src/lib/translit.ts) сервердаги модулнинг айнан нусхаси бўлиши шарт — фарқ қилиб қолмаслиги учун
it('веб ва сервер транслитератори айнан бир хил', () => {
  const { readFileSync } = require('fs'); const { join } = require('path');
  const server = readFileSync(join(__dirname, 'translit.ts'), 'utf8');
  const web = readFileSync(join(__dirname, '..', '..', '..', 'web', 'src', 'lib', 'translit.ts'), 'utf8');
  expect(web).toBe(server);
});
