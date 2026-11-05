/** SuperDoc (Word муҳаррири) ни керак бўлганда ўз доменимиздан (public/vendor) юклайди; ташқи CDN ишлатилмайди. */
let loading: Promise<any> | null = null;

export function loadSuperDoc(): Promise<any> {
  const w = window as any;
  if (w.SuperDoc) return Promise.resolve(w.SuperDoc);
  return (loading ??= new Promise((resolve, reject) => {
    // Муҳаррир ичидаги DOCX-engine ҳам ўз серверимиздан юклансин (aks ҳолда jsdelivr'га боради)
    w.SUPERDOC_ENGINE_CDN_BASE_URL = `${location.origin}/vendor/docx-engine`;
    const css = document.createElement('link');
    css.rel = 'stylesheet'; css.href = '/vendor/superdoc/superdoc.min.css';
    document.head.appendChild(css);
    const s = document.createElement('script');
    s.src = '/vendor/superdoc/superdoc.min.js'; s.async = true;
    s.onload = () => (w.SuperDoc ? resolve(w.SuperDoc) : (loading = null, reject(new Error('Муҳаррир юкланмади'))));
    s.onerror = () => { loading = null; reject(new Error('Муҳаррир файлларини юклаб бўлмади')); };
    document.head.appendChild(s);
  }));
}

/** Муҳаррир ишлаши учун керак бўлган файллар (self-host: public/vendor) */
export const VENDOR_FILES = [
  '/vendor/superdoc/superdoc.min.js',
  '/vendor/superdoc/superdoc.min.css',
  '/vendor/docx-engine/dist-cdn/docx-engine.es.js',
  '/vendor/docx-engine/dist-cdn/style.css',
];

export interface FileCheck { url: string; ok: boolean; line: string }

/**
 * Файллар серверда борми ва ҳақиқий файлми (SPA fallback HTML эмасми) — HEAD сўровлари билан текширади.
 * Муаммо серверда (файл йўқ, нотўғри турда, жавоб бермаяпти) эканини дарҳол кўрсатиш учун.
 */
export async function checkVendorFiles(timeoutMs = 15000): Promise<FileCheck[]> {
  return Promise.all(VENDOR_FILES.map(async (url) => {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), timeoutMs);
    try {
      const r = await fetch(url, { method: 'HEAD', cache: 'no-store', signal: ctl.signal });
      const type = r.headers.get('content-type') ?? '?';
      const size = r.headers.get('content-length');
      const html = type.includes('text/html');
      const ok = r.ok && !html;
      return { url, ok, line: `${ok ? 'OK ' : 'XATO'} ${r.status} ${type.split(';')[0]}${size ? ` ${Math.round(+size / 1024)} KB` : ''}${r.headers.get('content-encoding') ? ` (${r.headers.get('content-encoding')})` : ''}${html ? ' — файл ўрнига сайт саҳифаси қайтди (файл серверда йўқ)' : ''} — ${url}` };
    } catch (e) {
      return { url, ok: false, line: `XATO ${(e as Error).name === 'AbortError' ? `${timeoutMs / 1000} сонияда жавоб бермади` : (e as Error).message} — ${url}` };
    } finally { clearTimeout(t); }
  }));
}

/**
 * Ulanish tezligi: eng katta fayl (docx-engine) dan ~256 КБ ni o'qib o'lchaydi va to'liq yuklanish vaqtini baholaydi.
 * (nginx siqqan holda yuboradi, shuning uchun bu siqilgan hajm bo'yicha tezlik.)
 */
export async function measureSpeed(timeoutMs = 12000): Promise<string> {
  const url = '/vendor/docx-engine/dist-cdn/docx-engine.es.js';
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeoutMs);
  const t0 = performance.now();
  try {
    const r = await fetch(`${url}?speed=${Date.now()}`, { cache: 'no-store', signal: ctl.signal });
    if (!r.ok || !r.body) return `Тезлик синови: жавоб ${r.status}`;
    const reader = r.body.getReader();
    let got = 0;
    while (got < 256 * 1024) { const { done, value } = await reader.read(); if (done) break; got += value.byteLength; }
    ctl.abort();
    const sec = Math.max((performance.now() - t0) / 1000, 0.001);
    const kbps = Math.round(got / 1024 / sec);
    const enc = r.headers.get('content-encoding');
    // siqilmagan fayl ~10.6 МБ; siqilganda taxminan 2.6 МБ + worker'lar (~6 МБ) — jami ~9 МБ
    const total = Math.round((9 * 1024) / Math.max(kbps, 1));
    return `Тезлик: ~${kbps} КБ/с (${Math.round(got / 1024)} КБ ${sec.toFixed(1)} с ичида${enc ? `, ${enc}` : ', СИҚИЛМАГАН'}). Тўлиқ юклаш ≈ ${total} с`;
  } catch (e) {
    return (e as Error).name === 'AbortError' && performance.now() - t0 >= timeoutMs - 50 ? `Тезлик синови: ${timeoutMs / 1000} сонияда ${url} дан маълумот келмади` : `Тезлик синови: ${(e as Error).message}`;
  } finally { clearTimeout(t); }
}
