import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

/** Журнал ходимлари (operator, rahbar) бош саҳифа ўрнига журналга йўналтирилади */
export default function HomeRedirect({ children }: { children: ReactNode }) {
  const role = useAuth().user?.role;
  return role === 'operator' || role === 'rahbar' ? <Navigate to="/journal" replace /> : <>{children}</>;
}
