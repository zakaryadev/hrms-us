import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { useAuth } from '../../auth/AuthContext';
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
