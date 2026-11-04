import { useMutation } from '@tanstack/react-query';
import { Check } from 'lucide-react';
import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import AuthLayout from '../components/AuthLayout';
import { Field } from '../components/ui';
import { api } from '../lib/api';
import { Button, Input } from '../components/kit';

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
    <AuthLayout wide>
      <div>
        <ol className="mb-8 flex flex-wrap items-center gap-2 text-xs">
          {STEPS.map((s, i) => (
            <li key={s} className="flex items-center gap-2">
              <span className={`flex h-6 w-6 items-center justify-center rounded font-semibold ${i < step ? 'bg-emerald-600 text-white' : i === step ? 'bg-brand text-white' : 'bg-slate-200 text-slate-500'}`}>{i < step ? <Check size={14} /> : i + 1}</span>
              <span className={i === step ? 'font-medium text-slate-800' : 'text-slate-500'}>{s}</span>
              {i < STEPS.length - 1 && <span className="h-px w-6 bg-slate-300" />}
            </li>
          ))}
        </ol>

        {step === 0 && (
          <div className="space-y-4">
            <h1 className="text-[26px] font-semibold leading-tight tracking-tight text-navy">Тизимни дастлабки созлаш</h1>
            <p className="text-sm text-slate-600">Тизимда ҳали фойдаланувчи йўқ. Аввал биринчи <b>Суперадмин</b> ҳисобини яратамиз — у бошқа ходимларни (Кадрлар, Бухгалтер) қўшади ва ҳамма нарсани бошқаради. Сўнг ташкилот маълумотларини киритасиз (улар ҳужжатларга автоматик қўйилади).</p>
            <Button variant="primary"  onClick={() => setStep(1)}>Бошлаш</Button>
          </div>
        )}

        {step === 1 && (
          <form className="space-y-4" onSubmit={submitAdmin}>
            <h1 className="text-[26px] font-semibold leading-tight tracking-tight text-navy">Суперадмин ҳисоби</h1>
            <Field label="Ф.И.Ш. *"><Input required minLength={2} value={admin.fullName} onChange={(e) => setAdmin({ ...admin, fullName: e.target.value })} /></Field>
            <Field label="Логин * (лотин ҳарфлари, рақам, . _ -)"><Input required minLength={2} pattern="[a-zA-Z0-9._\-]+" autoComplete="username" value={admin.login} onChange={(e) => setAdmin({ ...admin, login: e.target.value })} /></Field>
            <Field label="Парол * (камида 8 белги)"><Input required type="password" autoComplete="new-password" value={admin.password} onChange={(e) => setAdmin({ ...admin, password: e.target.value })} /></Field>
            <Field label="Паролни тасдиқланг *"><Input required type="password" autoComplete="new-password" value={admin.confirm} onChange={(e) => setAdmin({ ...admin, confirm: e.target.value })} /></Field>
            {(localErr || create.error) && <p className="text-sm text-red-600" role="alert">{localErr || (create.error as Error).message}</p>}
            <div className="flex justify-between">
              <Button variant="secondary" type="button"  onClick={() => setStep(0)}>Орқага</Button>
              <Button variant="primary"  disabled={create.isPending}>Ҳисоб яратиш</Button>
            </div>
          </form>
        )}

        {step === 2 && (
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); saveOrg.mutate(); }}>
            <h1 className="text-[26px] font-semibold leading-tight tracking-tight text-navy">Ташкилот маълумотлари</h1>
            <p className="text-sm text-slate-500">Суперадмин ҳисоби яратилди ва сиз тизимга кирдингиз. Бу маълумотларни кейин «Справочниклар» бўлимида ўзгартириш мумкин.</p>
            <Field label="Ташкилот номи"><Input value={org.tashkilot_nomi} onChange={(e) => setOrg({ ...org, tashkilot_nomi: e.target.value })} /></Field>
            <Field label="Бош директор Ф.И.Ш."><Input value={org.bosh_direktor_fish} onChange={(e) => setOrg({ ...org, bosh_direktor_fish: e.target.value })} /></Field>
            <Field label="Шаҳар"><Input value={org.shahar} onChange={(e) => setOrg({ ...org, shahar: e.target.value })} /></Field>
            {saveOrg.error && <p className="text-sm text-red-600" role="alert">{(saveOrg.error as Error).message}</p>}
            <div className="flex justify-between">
              <Button variant="secondary" type="button"  onClick={finish}>Ўтказиб юбориш</Button>
              <Button variant="primary"  disabled={saveOrg.isPending}>Тугатиш</Button>
            </div>
          </form>
        )}
      </div>
    </AuthLayout>
  );
}
