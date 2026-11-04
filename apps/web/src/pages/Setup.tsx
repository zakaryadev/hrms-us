import { useMutation } from '@tanstack/react-query';
import { Check } from 'lucide-react';
import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { Field } from '../components/ui';
import { api } from '../lib/api';

const STEPS = ['Танишув', 'Суперадмин', 'Ташкилот'];

/** Дастлабки созлаш устаси: фойдаланувчилар йўқ бўлгандагина очилади. */
export default function Setup() {
  const { needsSetup, refresh } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [admin, setAdmin] = useState({ fullName: '', login: '', password: '', confirm: '' });
  const [org, setOrg] = useState({ tashkilot_nomi: '', bosh_direktor_fish: '', shahar: '' });
  const [localErr, setLocalErr] = useState('');

  const create = useMutation({
    mutationFn: () => api('/auth/setup', { method: 'POST', body: JSON.stringify({ fullName: admin.fullName, login: admin.login, password: admin.password }) }),
    onSuccess: () => setStep(2),
  });
  const saveOrg = useMutation({
    mutationFn: () => api('/settings', { method: 'PUT', body: JSON.stringify(Object.fromEntries(Object.entries(org).filter(([, v]) => v.trim()))) }),
    onSuccess: () => finish(),
  });
  const finish = async () => { await refresh(); navigate('/', { replace: true }); };

  // Админ яратилгандан кейин (3-қадам) needsSetup=false бўлади, лекин усталик тугаши керак
  if (!needsSetup && step < 2) return <Navigate to="/login" replace />;

  const submitAdmin = (e: React.FormEvent) => {
    e.preventDefault(); setLocalErr('');
    if (admin.password.length < 8) return setLocalErr('Парол камида 8 та белгидан иборат бўлиши керак');
    if (admin.password !== admin.confirm) return setLocalErr('Пароллар мос келмади');
    create.mutate();
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-white p-4">
      <div className="card w-full max-w-lg p-6">
        <img src="/logo.svg" alt="Logo" className="mx-auto mb-5 h-9" />
        <ol className="mb-6 flex items-center justify-center gap-2 text-xs">
          {STEPS.map((s, i) => (
            <li key={s} className="flex items-center gap-2">
              <span className={`flex h-6 w-6 items-center justify-center rounded-full font-semibold ${i < step ? 'bg-brand-600 text-white' : i === step ? 'bg-brand-600 text-white' : 'bg-surface-line text-ink-500'}`}>{i < step ? <Check size={14} /> : i + 1}</span>
              <span className={i === step ? 'font-medium text-ink' : 'text-ink-500'}>{s}</span>
              {i < STEPS.length - 1 && <span className="h-px w-6 bg-surface-line" />}
            </li>
          ))}
        </ol>

        {step === 0 && (
          <div className="space-y-4">
            <h1 className="text-xl font-semibold text-ink">Тизимни дастлабки созлаш</h1>
            <p className="text-sm text-ink-500">Тизимда ҳали фойдаланувчи йўқ. Аввал биринчи <b>Суперадмин</b> ҳисобини яратамиз — у бошқа ходимларни (Кадрлар, Бухгалтер) қўшади ва ҳамма нарсани бошқаради. Сўнг ташкилот маълумотларини киритасиз (улар ҳужжатларга автоматик қўйилади).</p>
            <button className="btn-primary" onClick={() => setStep(1)}>Бошлаш</button>
          </div>
        )}

        {step === 1 && (
          <form className="space-y-4" onSubmit={submitAdmin}>
            <h1 className="text-xl font-semibold text-ink">Суперадмин ҳисоби</h1>
            <Field label="Ф.И.Ш. *"><input required minLength={2} className="input" value={admin.fullName} onChange={(e) => setAdmin({ ...admin, fullName: e.target.value })} /></Field>
            <Field label="Логин * (лотин ҳарфлари, рақам, . _ -)"><input required minLength={2} pattern="[a-zA-Z0-9._\-]+" autoComplete="username" className="input" value={admin.login} onChange={(e) => setAdmin({ ...admin, login: e.target.value })} /></Field>
            <Field label="Парол * (камида 8 белги)"><input required type="password" autoComplete="new-password" className="input" value={admin.password} onChange={(e) => setAdmin({ ...admin, password: e.target.value })} /></Field>
            <Field label="Паролни тасдиқланг *"><input required type="password" autoComplete="new-password" className="input" value={admin.confirm} onChange={(e) => setAdmin({ ...admin, confirm: e.target.value })} /></Field>
            {(localErr || create.error) && <p className="text-sm text-red-600" role="alert">{localErr || (create.error as Error).message}</p>}
            <div className="flex justify-between">
              <button type="button" className="btn-secondary" onClick={() => setStep(0)}>Орқага</button>
              <button className="btn-primary" disabled={create.isPending}>Ҳисоб яратиш</button>
            </div>
          </form>
        )}

        {step === 2 && (
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); saveOrg.mutate(); }}>
            <h1 className="text-xl font-semibold text-ink">Ташкилот маълумотлари</h1>
            <p className="text-sm text-ink-500">Суперадмин ҳисоби яратилди ва сиз тизимга кирдингиз. Бу маълумотларни кейин «Справочниклар» бўлимида ўзгартириш мумкин.</p>
            <Field label="Ташкилот номи"><input className="input" value={org.tashkilot_nomi} onChange={(e) => setOrg({ ...org, tashkilot_nomi: e.target.value })} /></Field>
            <Field label="Бош директор Ф.И.Ш."><input className="input" value={org.bosh_direktor_fish} onChange={(e) => setOrg({ ...org, bosh_direktor_fish: e.target.value })} /></Field>
            <Field label="Шаҳар"><input className="input" value={org.shahar} onChange={(e) => setOrg({ ...org, shahar: e.target.value })} /></Field>
            {saveOrg.error && <p className="text-sm text-red-600" role="alert">{(saveOrg.error as Error).message}</p>}
            <div className="flex justify-between">
              <button type="button" className="btn-secondary" onClick={finish}>Ўтказиб юбориш</button>
              <button className="btn-primary" disabled={saveOrg.isPending}>Тугатиш</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
