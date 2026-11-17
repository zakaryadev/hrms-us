import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../auth/AuthContext';
import type { Manual, Sort } from '../../components/DataTable';
import { api } from '../../lib/api';
import { useScript } from '../../lib/script';
import type { Meta, Org, OptionKind, OptionRef } from './types';

/** Ёзиш ҳуқуқи: фақат superadmin ва operator (серверда ҳам шундай). */
export const useJournalWrite = () => { const r = useAuth().user?.role; return r === 'superadmin' || r === 'operator'; };

/** Рўйхатлар (иш тури, канал…) ва меъёр: барча формалар учун бир сўров. */
export const useMeta = () => useQuery({ queryKey: ['j-meta'], queryFn: () => api<Meta>('/journal/meta'), staleTime: 60_000 });
export const useOrgs = () => useQuery({ queryKey: ['j-orgs'], queryFn: () => api<Org[]>('/journal/orgs'), staleTime: 30_000 });

/** Рўйхат элементи номи танланган ёзувда (кирилл/лотин) */
export function useL() {
  const { script } = useScript();
  return useCallback((o?: OptionRef | null) => (o ? (script === 'cyr' ? o.cyr : o.lat) : ''), [script]);
}
/** Танлов учун фаол элементлар (+ ёзувда жорий қиймат яширилган бўлса ҳам кўринади) */
export function useOptions(kind: OptionKind, currentId?: string | null) {
  const meta = useMeta().data;
  return (meta?.options[kind] ?? []).filter((o) => o.active || o.id === currentId);
}
export function useRefresh() {
  const qc = useQueryClient();
  return useCallback(() => Promise.all([qc.invalidateQueries({ queryKey: ['j'] }), qc.invalidateQueries({ queryKey: ['j-orgs'] }), qc.invalidateQueries({ queryKey: ['j-meta'] })]), [qc]);
}

/** Сервер режимидаги жадвал ҳолати (саҳифа, ўлчам, тартиб, қидирув) — DataTable `manual` учун. Фильтрлар ўзгарса саҳифа 1 га қайтади. */
export function useTableState(storageKey: string, filters: unknown[]) {
  const stored = (() => { try { return (JSON.parse(localStorage.getItem(`dt:${storageKey}`) ?? '{}') as { pageSize?: number }).pageSize; } catch { return undefined; } })();
  const [page, setPage] = useState(1), [pageSize, setPageSize] = useState(stored ?? 20), [sort, setSort] = useState<Sort>(null), [search, setSearch] = useState('');
  const key = JSON.stringify(filters);
  useEffect(() => setPage(1), [key]);   // eslint-disable-line react-hooks/exhaustive-deps
  const query = (extra: Record<string, string | undefined>) => {
    const p = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    const all = { q: search.trim(), sortBy: sort?.key, sortDir: sort?.dir, ...extra };
    for (const [k, v] of Object.entries(all)) if (v) p.set(k, v);
    return p.toString();
  };
  const manual = (total: number): Manual => ({ total, page, pageSize, onPage: setPage, onPageSize: setPageSize, sort, onSort: setSort, search, onSearch: setSearch });
  return { query, manual };
}
