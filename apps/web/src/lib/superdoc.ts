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
