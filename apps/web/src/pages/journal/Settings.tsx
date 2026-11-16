import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Button, Field, Input, Textarea } from '../../components/kit';
import { ErrorNote, Loading, PageHeader } from '../../components/ui';
import { api } from '../../lib/api';
import { useT } from '../../lib/script';
import { useSettings } from './JournalList';

const TITLES: Record<string, string> = {
  workTypes: 'Иш турлари', statuses: 'Ҳолатлар', channels: 'Мурожаат каналлари', priorities: 'Устуворлик', groups: 'Мижозлар гуруҳи',
  formats: 'Ўқитиш форматлари', categories: 'Мурожаат категориялари', kbStatus: 'Билимлар базаси ҳолатлари', kbTypes: 'Материал турлари',
};

export default function JournalSettings() {
  const t = useT(), qc = useQueryClient(), s = useSettings();
  const [lists, setLists] = useState<Record<string, string>>({}), [norm, setNorm] = useState('0'), [saved, setSaved] = useState(false);
  useEffect(() => {
    if (!s.data) return;
    setNorm(String(s.data.normDays));
    setLists(Object.fromEntries(Object.entries(s.data.lists).map(([k, v]) => [k, v.join('\n')])));
  }, [s.data]);
  const m = useMutation({
    mutationFn: () => api('/journal/settings', { method: 'PATCH', body: JSON.stringify({
      normDays: Math.max(0, Math.floor(Number(norm) || 0)),
      lists: Object.fromEntries(Object.entries(lists).map(([k, v]) => [k, v.split('\n').map((x) => x.trim()).filter(Boolean)])),
    }) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['j-settings'] }); qc.invalidateQueries({ queryKey: ['j'] }); setSaved(true); setTimeout(() => setSaved(false), 2000); },
  });
  if (!s.data) return <Loading rows={6} />;
  return (
    <div className="space-y-5">
      <PageHeader title={t('Журнал созламалари')} hint={t('Очиладиган рўйхатлар ва мурожаатни кўриб чиқиш меъёри. Ўзгартириш фақат суперадминга рухсат этилган.')}>
        {saved && <span className="text-sm text-emerald-700">{t('Сақланди')}</span>}
        <Button onClick={() => m.mutate()} loading={m.isPending}>{t('Сақлаш')}</Button>
      </PageHeader>
      <ErrorNote error={m.error} />
      <section className="card p-5">
        <h2 className="mb-3 text-sm font-semibold">{t('Умумий')}</h2>
        <Field label={t('Мурожаатни кўриб чиқиш меъёри (кун)')} hint={t('0 — меъёр белгиланмаган. Муддатдан ошганлар ҳисоботда қизил билан ажратилади.')} className="max-w-sm">
          <Input type="number" min={0} value={norm} onChange={(e) => setNorm(e.target.value)} />
        </Field>
      </section>
      <section className="card p-5">
        <h2 className="mb-1 text-sm font-semibold">{t('Рўйхатлар (очиладиган танловлар)')}</h2>
        <p className="mb-4 text-sm text-slate-500">{t('Ҳар бир қиймат — алоҳида қаторда. Қийматлар лотинда сақланади, интерфейсда танланган ёзувда кўринади.')}</p>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Object.keys(TITLES).map((k) => (
            <Field key={k} label={t(TITLES[k])}><Textarea translit={false} rows={6} value={lists[k] ?? ''} onChange={(e) => setLists({ ...lists, [k]: e.target.value })} /></Field>
          ))}
        </div>
        <p className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-800">{t('Муҳим: «Ҳолатлар» рўйхатида «Hal qilindi», «Boshqa bo‘limga yuborildi» ва «Bekor qilindi» қийматларини ўзгартирманг — ҳисобот шуларга таянади.')}</p>
      </section>
    </div>
  );
}
