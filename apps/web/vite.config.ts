import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';

const here = dirname(fileURLToPath(import.meta.url));

/**
 * Word муҳаррири (SuperDoc) файллари Vite орқали ЎТМАЙДИ (13 МБ'лик worker фойдаланувчи йиғишда хотирани тугатади):
 * тайёр CDN-йиғмаси ва DOCX-engine node_modules дан public/vendor га нусхаланади ва ўз доменимиздан берилади.
 * Қаранг: src/lib/superdoc.ts
 */
function superdocAssets(): Plugin {
  const find = (pkg: string) => [resolve(here, 'node_modules', pkg), resolve(here, '../../node_modules', pkg)].find((p) => existsSync(p));
  return {
    name: 'superdoc-assets',
    buildStart() {
      const sd = find('superdoc'), eng = find('@superdoc/docx-engine');
      if (!sd || !eng) { this.warn('superdoc топилмади: Word муҳаррири ишламайди (npm ci қилинг)'); return; }
      const version = (p: string) => JSON.parse(readFileSync(join(p, 'package.json'), 'utf8')).version as string;
      const out = resolve(here, 'public/vendor');
      const stamp = join(out, '.versions');
      const want = `superdoc@${version(sd)} docx-engine@${version(eng)}`;
      if (existsSync(stamp) && readFileSync(stamp, 'utf8') === want) return;   // аллақачон нусхаланган
      mkdirSync(out, { recursive: true });
      cpSync(join(sd, 'dist-cdn'), join(out, 'superdoc'), { recursive: true });
      cpSync(join(eng, 'dist-cdn'), join(out, 'docx-engine/dist-cdn'), { recursive: true });
      for (const f of ['DOCX-ENGINE-LICENSE.md', 'NOTICE.md']) if (existsSync(join(eng, f))) cpSync(join(eng, f), join(out, 'docx-engine', f));
      cpSync(join(sd, 'LICENSE'), join(out, 'superdoc/LICENSE'));
      writeFileSync(stamp, want);
    },
  };
}

export default defineConfig({
  plugins: [react(), superdocAssets()],
  server: { proxy: { '/api': 'http://localhost:3000' } },
});
