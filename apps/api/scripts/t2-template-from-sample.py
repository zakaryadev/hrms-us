#!/usr/bin/env python3
"""
Т-2 «Маълумотнома» шаблонини НАМУНАВИЙ Word ҳужжатдан (1:1) ясайди:
шрифт, жадвал, фото ўрни ва форматлаш намунадан сақланади, фақат маълумот ўрнига {{майдон}} қўйилади.

  python3 apps/api/scripts/t2-template-from-sample.py <намуна.docx>

Натижа: apps/api/templates/cyr/obyektivka.docx ва apps/api/templates/lat/obyektivka.docx
(намунадаги шахсий маълумотлар ва фото шаблонга ўтмайди).
"""
import copy, io, re, struct, sys, zipfile, zlib
from pathlib import Path
from lxml import etree

W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
N = {'w': W}
q = lambda t: '{%s}%s' % (W, t)
XML_SPACE = '{http://www.w3.org/XML/1998/namespace}space'
COL2 = 4248       # twips: иккинчи устун (намунада 6 та 708 twips'лик табулация)
PHOTO_GAP = 1950   # twips: фото кенглиги + бўш жой
OUT = Path(__file__).resolve().parent.parent / 'templates'

# ── кирилл → лотин: статик ёрлиқлар (шаблон матнлари) ──
LAT = {
    'МАЪЛУМОТНОМА': "MA'LUMOTNOMA", 'Туғилган йили:': "Tug'ilgan yili:", 'Туғилган жойи:': "Tug'ilgan joyi:",
    'Миллати: ': 'Millati: ', 'Партиявийлиги:': 'Partiyaviyligi:', 'Маълумоти:': "Ma'lumoti:", 'Тамомлаган:': 'Tamomlagan:',
    'Маълумоти бўйича мутахассислиги:': "Ma'lumoti bo'yicha mutaxassisligi:", 'Илмий даражаси:': 'Ilmiy darajasi:',
    'Илмий унвони:': 'Ilmiy unvoni:', 'Қайси чет тилларини билади:': 'Qaysi chet tillarini biladi:',
    'Ҳарбий (махсус) унвони:': "Harbiy (maxsus) unvoni:", 'Давлат мукофотларига эгами (қайси):': 'Davlat mukofotlariga egami (qaysi):',
    'Халқ депутатлари республика, вилоят, шаҳар ва туман Кенгаши депутатими ёки бошқа сайланадиган органларнинг аъзосими (тўлиқ кўрсатилиши лозим):':
        "Xalq deputatlari respublika, viloyat, shahar va tuman Kengashi deputatimi yoki boshqa saylanadigan organlarning a'zosimi (to'liq ko'rsatilishi lozim):",
    'МЕҲНАТ ФАОЛИЯТИ': 'MEHNAT FAOLIYATI', 'М А Ъ Л У М О Т': "M A ' L U M O T", 'Қариндош-лиги': 'Qarindosh-ligi',
    'Фамилияси, исми ': 'Familiyasi, ismi ', 'ва отасининг исми': 'va otasining ismi', 'Туғилган ': "Tug'ilgan ", 'йили ва жойи': 'yili va joyi',
    'Иш жойи ва лавозими': 'Ish joyi va lavozimi', 'Турар жойи': 'Turar joyi',
    ' яқин қариндошлари ҳақида': ' yaqin qarindoshlari haqida', 'нинг': 'ning',
}

def txt(p): return ''.join(t.text or '' for t in p.iter(q('t')))
def ts(p): return list(p.iter(q('t')))
def settext(t, s):
    t.text = s
    if s != s.strip() or '  ' in s: t.set(XML_SPACE, 'preserve')
def fill(p, *texts):
    """p ичидаги w:t элементларига кетма-кет матн беради, қолганларини бўшатади"""
    el = ts(p)
    for i, t in enumerate(el): settext(t, texts[i] if i < len(texts) else '')
def find(body, start, nth=0):
    hits = [p for p in body.iter(q('p')) if txt(p).startswith(start)]
    assert len(hits) > nth, f'абзац топилмади: {start!r}'
    return hits[nth]
def drop(el): el.getparent().remove(el)

def clone_with(p, text):
    c = copy.deepcopy(p)
    runs = c.findall('w:r', N)
    for r in runs[1:]: c.remove(r)
    fill(c, text)
    for br in c.iter(q('tab'), q('br')): br.getparent().remove(br)
    return c

def loop(p, name, content):
    """{{#name}} / {{/name}} алоҳида абзацларда — бўш бўлса ёки такрорланса абзацлар тўлиқ олинади/кўпаяди"""
    op, cl = clone_with(p, '{{#%s}}' % name), clone_with(p, '{{/%s}}' % name)
    fill(p, content)
    p.addprevious(op); p.addnext(cl)

AFTER = ('contextualSpacing', 'mirrorIndents', 'suppressOverlap', 'jc', 'textDirection', 'textAlignment', 'textboxTightWrap', 'outlineLvl', 'divId', 'cnfStyle', 'rPr', 'sectPr', 'pPrChange')
def right_indent(p, tw):
    """Фото (ўнг юқори) устига матн чиқиб кетмаслиги учун ўнг чегара"""
    ppr = p.find('w:pPr', N)
    if ppr is None: ppr = etree.SubElement(p, q('pPr')); p.insert(0, ppr)
    ind = ppr.find('w:ind', N)
    if ind is None:
        ind = etree.Element(q('ind'))
        nxt = next((c for c in ppr if etree.QName(c).localname in AFTER), None)
        nxt.addprevious(ind) if nxt is not None else ppr.append(ind)
    ind.set(q('right'), str(tw))

PPR_AFTER_TABS = ('suppressAutoHyphens', 'kinsoku', 'wordWrap', 'overflowPunct', 'topLinePunct', 'autoSpaceDE', 'autoSpaceDN', 'bidi', 'adjustRightInd',
                  'snapToGrid', 'spacing', 'ind', 'contextualSpacing', 'mirrorIndents', 'suppressOverlap', 'jc', 'textDirection', 'textAlignment',
                  'textboxTightWrap', 'outlineLvl', 'divId', 'cnfStyle', 'rPr', 'sectPr', 'pPrChange')
def fix_tabs(p):
    """Кетма-кет табуляциялар (тил ўзгарса устун силжийди) → битта табулация + аниқ позиция"""
    seen = False
    for r in p.findall('w:r', N):
        tabs = r.findall('w:tab', N)
        if not tabs: continue
        for i, t in enumerate(tabs):
            if seen or i > 0: r.remove(t)
        seen = True
        if not [c for c in r if etree.QName(c).localname != 'rPr']: p.remove(r)
    if not seen: return
    ppr = p.find('w:pPr', N)
    if ppr is None: ppr = etree.Element(q('pPr')); p.insert(0, ppr)
    for old in ppr.findall('w:tabs', N): ppr.remove(old)
    tabs = etree.Element(q('tabs'))
    clr = etree.SubElement(tabs, q('tab')); clr.set(q('val'), 'clear'); clr.set(q('pos'), '3960')   # «Heading 6» услубидаги тўхташ жойи
    tab = etree.SubElement(tabs, q('tab')); tab.set(q('val'), 'left'); tab.set(q('pos'), str(COL2))
    nxt = next((c for c in ppr if etree.QName(c).localname in PPR_AFTER_TABS), None)
    nxt.addprevious(tabs) if nxt is not None else ppr.append(tabs)

def photo_placeholder(w=817, h=1091):
    """Оқ фон + кулранг рамка (3x4 фото ўрни) — PIL керак эмас, соф PNG"""
    rows = []
    for y in range(h):
        edge = y < 3 or y >= h - 3
        row = bytearray([0])
        for x in range(w):
            c = 170 if (edge or x < 3 or x >= w - 3) else 255
            row += bytes((c, c, c))
        rows.append(bytes(row))
    raw = zlib.compress(b''.join(rows), 9)
    def chunk(t, d): return struct.pack('>I', len(d)) + t + d + struct.pack('>I', zlib.crc32(t + d) & 0xffffffff)
    return b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 2, 0, 0, 0)) + chunk(b'IDAT', raw) + chunk(b'IEND', b'')

def build(sample: Path, lang: str):
    zin = zipfile.ZipFile(sample)
    root = etree.fromstring(zin.read('word/document.xml'))
    body = root.find('w:body', N)

    # 1) сарлавҳа, исм, иш жойи
    fill(find(body, 'Муратбаев Закарья Бахтияр улы'), '{{xodim_fish}}')
    hire = find(body, '2026 йил'); fill(hire, '{{ishga_kirish_matn}}:'); right_indent(hire, PHOTO_GAP)
    org = find(body, '“UNICON-SOFT” МЧЖ'); fill(org, '{{ish_joyi_matn}}'); right_indent(org, PHOTO_GAP)
    drop(find(body, 'тизимини жорий этиш'))

    # 2) шахсий маълумот (қийматлар ёрлиқдан кейинги сатрда)
    right_indent(find(body, 'Туғилган йили:'), PHOTO_GAP)
    p = find(body, '13.10.2003'); fill(p, '{{tugilgan_sana}}', '{{tugilgan_joy_1}}', '', ''); right_indent(p, PHOTO_GAP)
    p2 = find(body, 'Нукус шаҳри'); right_indent(p2, PHOTO_GAP); loop(p2, 'tugilgan_joy_2', '{{tugilgan_joy_2}}')
    p = find(body, 'қорақалпоқ'); fill(p, '{{millati}}', '', '{{partiyaviyligi}}')
    p = find(body, 'олий'); fill(p, '{{malumoti}}', '{{tamomlagan}}', '')
    fill(find(body, 'Маълумоти бўйича мутахассислиги:'), 'Маълумоти бўйича мутахассислиги:', '{{mutaxassisligi}}')
    # 'йўқ' абзацлари: [илмий даража|унвон], [тил|ҳарбий], [мукофот], [депутат]
    yok = [x for x in body.iter(q('p')) if txt(x).strip() in ('йўқйўқ', 'Рус тилийўқ', 'йўқ') or txt(x).startswith('Халқ депутатлари')]
    assert len(yok) == 4, [txt(x)[:30] for x in yok]
    fill(yok[0], '{{ilmiy_daraja}}', '{{ilmiy_unvon}}')
    fill(yok[1], '{{chet_tillari}}', '{{harbiy_unvoni}}')
    fill(yok[2], '{{mukofotlar}}')
    ts_ = ts(yok[3]); settext(ts_[-1], '{{deputatlik}}')

    # 3) меҳнат фаолияти: 3 та сатр → битта такрорланувчи абзац (охиргисининг ҳанging-indent'и сақланади)
    rows = [x for x in body.iter(q('p')) if re.match(r'^(2021|2023|2026)[- ]', txt(x))]
    assert len(rows) == 3
    loop(rows[2], 'ish_joylari', '{{davr}} - {{joy}}')
    drop(rows[0]); drop(rows[1])

    # 4) қариндошлар сарлавҳаси
    p = find(body, 'Муратбаев Закарья Бахтияр улынинг')
    for t in ts(p):
        if 'Муратбаев' in (t.text or ''): settext(t, '{{xodim_fish}}')

    # 5) қариндошлар жадвали: биринчи маълумот қатори қолади, қолгани ўчади
    tbl = body.find('w:tbl', N); trs = tbl.findall('w:tr', N); assert len(trs) == 6, len(trs)
    for tr in trs[2:]: drop(tr)
    tcs = trs[1].findall('w:tc', N)
    def first_p(tc, text):
        ps = tc.findall('w:p', N); fill(ps[0], text)
        for x in ps[1:]: drop(x)
    first_p(tcs[0], '{{#qarindoshlar}}{{qarindoshligi}}'); first_p(tcs[1], '{{fish}}'); first_p(tcs[2], '{{tugilgan_yil_joy}}')
    first_p(tcs[3], '{{ish_joyi}}'); first_p(tcs[4], '{{manzili}}{{/qarindoshlar}}')

    for p in list(body.findall('w:p', N)): fix_tabs(p)

    # 6) лотин: ёрлиқлар + тил белгиси
    if lang == 'lat':
        miss = []
        for t in root.iter(q('t')):
            k = t.text if t.text in LAT else next((k for k in LAT if k.strip() == (t.text or '').strip() and (t.text or '').strip()), None)
            if k is not None:
                lead = (t.text or '')[:len(t.text or '') - len((t.text or '').lstrip())]; tail = (t.text or '')[len((t.text or '').rstrip()):]
                settext(t, LAT[k] if t.text == k else lead + LAT[k].strip() + tail)
            elif re.search('[А-Яа-яЎўҚқҒғҲҳ]', t.text or '') and '{{' not in (t.text or ''): miss.append(t.text)
        assert not miss, f'таржима қилинмаган матнлар: {miss}'
        for e in root.iter():
            for k, v in list(e.attrib.items()):
                if k == q('val') and v == 'uz-Cyrl-UZ': e.set(k, 'uz-Latn-UZ')
    xml = etree.tostring(root, xml_declaration=True, encoding='UTF-8', standalone=True)

    # 7) ёзиш: фото — нейтрал рамка; метамаълумотдан муаллиф ўчади
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, 'w', zipfile.ZIP_DEFLATED) as zo:
        for it in zin.infolist():
            data = zin.read(it.filename)
            if it.filename == 'word/document.xml': data = xml
            elif it.filename == 'word/media/image1.png': data = photo_placeholder()
            elif it.filename == 'docProps/core.xml':
                s = data.decode('utf8')
                s = re.sub(r'(<dc:creator>)[^<]*', r'\1', s); s = re.sub(r'(<cp:lastModifiedBy>)[^<]*', r'\1', s)
                s = re.sub(r'(<dc:title>)[^<]*', r'\1', s); data = s.encode('utf8')
            zo.writestr(it, data)
    out = OUT / lang / 'obyektivka.docx'
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_bytes(buf.getvalue())
    print('ёзилди:', out)

if __name__ == '__main__':
    if len(sys.argv) != 2: sys.exit(__doc__)
    for l in ('cyr', 'lat'): build(Path(sys.argv[1]), l)
