import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createContext, ReactNode, useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { Loading } from '../components/ui';
import { api } from '../lib/api';

export interface Me { id: string; login: string; fullName: string; role: 'superadmin' | 'kadrlar' | 'buxgalter' }
interface Ctx { user: Me | null; needsSetup: boolean; logout: () => Promise<void>; refresh: () => Promise<void> }
const AuthCtx = createContext<Ctx>(null as any);
export const useAuth = () => useContext(AuthCtx);
/** Бухгалтер фақат кўради (табелдан ташқари); superadmin — созламалар, шаблон, журнал. */
export const useCan = () => { const r = useAuth().user?.role; return { write: r !== 'buxgalter', admin: r === 'superadmin' }; };

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const setup = useQuery({ queryKey: ['setup-status'], queryFn: () => api<{ needsSetup: boolean }>('/auth/setup-status'), staleTime: 0 });
  const needsSetup = setup.data?.needsSetup ?? false;
  const me = useQuery({
    queryKey: ['me'], enabled: setup.isSuccess && !needsSetup, retry: false, staleTime: 60_000,
    queryFn: () => api<Me>('/auth/me').catch(() => null),
  });

  if (setup.isLoading || (setup.isSuccess && !needsSetup && me.isLoading)) return <div className="p-8"><Loading /></div>;
  if (setup.isError) return <div className="p-8 text-sm text-red-600">Серверга уланиб бўлмади. Бироздан кейин қайта уриниб кўринг.</div>;

  const refresh = async () => { await qc.invalidateQueries({ queryKey: ['setup-status'] }); await qc.invalidateQueries({ queryKey: ['me'] }); };
  const logout = async () => {
    await api('/auth/logout', { method: 'POST' }).catch(() => undefined);
    qc.clear();
    window.location.assign('/login');
  };
  return <AuthCtx.Provider value={{ user: me.data ?? null, needsSetup, logout, refresh }}>{children}</AuthCtx.Provider>;
}

/** Кириш талаб қилинган саҳифалар; роль берилса — фақат шу ролларга. */
export function RequireAuth({ children, roles }: { children: ReactNode; roles?: Me['role'][] }) {
  const { user, needsSetup } = useAuth();
  if (needsSetup) return <Navigate to="/setup" replace />;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return <>{children}</>;
}
