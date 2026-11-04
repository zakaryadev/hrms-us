import { useMutation } from '@tanstack/react-query';
import { LogIn } from 'lucide-react';
import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { Field } from '../components/ui';
import { api } from '../lib/api';

export default function Login() {
  const { user, needsSetup, refresh } = useAuth();
  const navigate = useNavigate();
  const [f, setF] = useState({ login: '', password: '' });
  const login = useMutation({
    mutationFn: () => api('/auth/login', { method: 'POST', body: JSON.stringify(f) }),
    onSuccess: async () => { await refresh(); navigate('/', { replace: true }); },
  });
  if (needsSetup) return <Navigate to="/setup" replace />;
  if (user) return <Navigate to="/" replace />;
  return (
    <div className="flex min-h-screen items-center justify-center bg-white p-4">
      <form className="card w-full max-w-sm space-y-4 p-6" onSubmit={(e) => { e.preventDefault(); login.mutate(); }}>
        <img src="/logo.svg" alt="Logo" className="mx-auto h-9" />
        <div className="text-center">
          <h1 className="text-xl font-semibold text-ink">Тизимга кириш</h1>
          <p className="mt-1 text-sm text-ink-500">Кадрлар бўлими бошқаруви тизими</p>
        </div>
        <Field label="Логин"><input required autoFocus autoComplete="username" className="input" value={f.login} onChange={(e) => setF({ ...f, login: e.target.value })} /></Field>
        <Field label="Парол"><input required type="password" autoComplete="current-password" className="input" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /></Field>
        {login.error && <p className="text-sm text-red-600" role="alert">{(login.error as Error).message}</p>}
        <button className="btn-primary w-full justify-center" disabled={login.isPending}><LogIn size={16} /> Кириш</button>
      </form>
    </div>
  );
}
