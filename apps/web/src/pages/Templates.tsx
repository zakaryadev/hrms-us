import { useQuery } from '@tanstack/react-query';
import { Download } from 'lucide-react';
import { api, fmtDate } from '../lib/api';
import { buttonStyles, cn } from '../components/kit';
import { PageHeader } from '../components/ui';

type Tpl = { lang: 'lat' | 'cyr'; name: string; label: string; size: number; modifiedAt: string; fields: string[] };
const LANG: Record<string, string> = { lat: 'Лотин', cyr: 'Кирилл' };

export default function Templates() {
  const q = useQuery({ queryKey: ['templates'], queryFn: () => api<Tpl[]>('/documents/templates') });
  return (
    <div className="space-y-4">
      <PageHeader title="Ҳужжат шаблонлари" hint="Ҳужжатлар шу Word (DOCX) шаблонлардан яратилади. Юклаб олиб таҳрирланг; {{майдон}} белгиларини ўзгартирманг." />
      <div className="card p-4 text-sm text-slate-600">
        Шаблонни ўзгартириш: файлни юклаб олинг, Word’да таҳрирланг ва серверда <code className="rounded bg-slate-100 px-1">apps/api/templates/&lt;lat|cyr&gt;/</code> папкасидаги файл ўрнига қўйиб, қайта деплой қилинг.
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-slate-200"><tr><th className="th">Шаблон</th><th className="th">Ёзув</th><th className="th">Ўлчам</th><th className="th">Ўзгартирилган</th><th className="th">Майдонлар</th><th /></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {q.data?.map((t) => (
              <tr key={t.lang + t.name} className="align-top hover:bg-slate-50">
                <td className="td"><div className="font-medium">{t.label}</div><div className="font-mono text-xs text-slate-500">{t.name}.docx</div></td>
                <td className="td">{LANG[t.lang] ?? t.lang}</td>
                <td className="td whitespace-nowrap">{(t.size / 1024).toFixed(1)} KB</td>
                <td className="td whitespace-nowrap">{fmtDate(t.modifiedAt)}</td>
                <td className="td">
                  <details><summary className="cursor-pointer text-sm text-slate-600">{t.fields.length} та майдон</summary>
                    <div className="mt-2 flex max-w-md flex-wrap gap-1">{t.fields.map((f) => <code key={f} className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">{`{{${f}}}`}</code>)}</div>
                  </details>
                </td>
                <td className="td text-right"><a className={cn(buttonStyles({ variant: 'secondary', size: 'sm' }))} href={`/api/documents/templates/${t.lang}/${t.name}/download`}><Download size={14} /> DOCX</a></td>
              </tr>
            ))}
            {q.data?.length === 0 && <tr><td colSpan={6} className="td py-10 text-center text-slate-500">Шаблонлар топилмади</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
