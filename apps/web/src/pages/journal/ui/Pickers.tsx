import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Select } from '../../../components/kit';
import { api } from '../../../lib/api';
import { useT } from '../../../lib/script';
import { useL, useOptions, useOrgs, useRefresh } from '../hooks';
import type { OptionKind, Org, Page, Ticket } from '../types';
import { Combobox } from './Combobox';

/** Ташкилот: қидириш + рўйхатда йўқ бўлса шу ердан янгисини қўшиш */
export function OrgPicker({ value, onChange, disabled, className }: { value: string | null; onChange: (id: string | null, org?: Org) => void; disabled?: boolean; className?: string }) {
  const t = useT(), orgs = useOrgs(), refresh = useRefresh(), [q, setQ] = useState('');
  const items = useMemo(() => {
    const k = q.toLowerCase();
    return (orgs.data ?? []).filter((o) => !k || `${o.name} ${o.region}`.toLowerCase().includes(k)).slice(0, 30).map((o) => ({ id: o.id, label: o.name, hint: o.region || undefined }));
  }, [orgs.data, q]);
  return (
    <Combobox value={value} items={items} onQuery={setQ} disabled={disabled} className={className} placeholder={t('Ташкилот')} aria-label={t('Ташкилот')}
      emptyLabel={t('Ташкилот топилмади')} createLabel={(x) => `${t('Янги ташкилот')}: «${x}»`}
      onSelect={(id) => onChange(id, orgs.data?.find((o) => o.id === id))}
      onCreate={async (name) => { const o = await api<Org>('/journal/orgs', { method: 'POST', body: JSON.stringify({ name }) }); await refresh(); onChange(o.id, o); }} />
  );
}

/** Мурожаат: ID, муаммо ёки ташкилот бўйича серверда қидириш (фақат очиқлар; `orgId` бўлса — шу ташкилотники) */
export function TicketPicker({ value, valueLabel, orgId, onChange, disabled, className }: {
  value: string | null; valueLabel?: string; orgId?: string | null; onChange: (id: string | null, ticket?: Ticket) => void; disabled?: boolean; className?: string;
}) {
  const t = useT(), [q, setQ] = useState('');
  const res = useQuery({
    queryKey: ['j', 'ticket-pick', q, orgId ?? ''],
    queryFn: () => api<Page<Ticket>>(`/journal/tickets?open=true&pageSize=8${q ? `&q=${encodeURIComponent(q)}` : ''}${orgId ? `&orgId=${orgId}` : ''}`),
    staleTime: 10_000,
  });
  const tickets = res.data?.items ?? [];
  const items = tickets.map((x) => ({ id: x.id, label: `${x.code} · ${x.problem.slice(0, 60)}`, hint: x.org?.name }));
  return (
    <Combobox value={value} items={items} onQuery={setQ} disabled={disabled} className={className} placeholder={t('Мурожаат (ихтиёрий)')} aria-label={t('Боғлиқ мурожаат')}
      selectedLabel={valueLabel} emptyLabel={t('Очиқ мурожаат топилмади')}
      onSelect={(id) => onChange(id, tickets.find((x) => x.id === id))} />
  );
}

/** Рўйхат элементи танлови (иш тури, канал…) — номи танланган ёзувда */
export function OptionSelect({ kind, value, onChange, placeholder, className }: { kind: OptionKind; value: string | null; onChange: (id: string | null) => void; placeholder: string; className?: string }) {
  const l = useL(), opts = useOptions(kind, value);
  // Кенглик ўрама элементда: kit Select тугмаси ҳар доим w-full (cn ўзаро зиддиятли классларни бирлаштирмайди)
  return (
    <div className={className}>
      <Select value={value ?? ''} onChange={(v) => onChange(v || null)} placeholder={placeholder} aria-label={placeholder}
        options={[{ value: '', label: placeholder }, ...opts.map((o) => ({ value: o.id, label: l(o) }))]} plain />
    </div>
  );
}
