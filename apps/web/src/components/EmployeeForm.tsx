import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { Field, Modal } from './ui';

const toInput = (d?: string | null) => (d ? d.slice(0, 10) : '');

export default function EmployeeForm({ employee, onClose }: { employee?: any; onClose: () => void }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [f, setF] = useState<any>(() => ({
    tabNumber: '', lastName: '', firstName: '', middleName: '', birthDate: '', birthPlace: '', gender: '',
    nationality: '', partyMembership: '', phone: '', addressResidential: '', pinfl: '', passportSeriesNumber: '',
    passportGivenDate: '', passportGivenBy: '', departmentId: '', positionId: '', employmentType: 'shtat',
    hireDate: '', contractNumber: '', contractDate: '', contractDurationType: 'muddatsiz', probationMonths: 0,
    salary: 0, annualLeaveBasicDays: 21, annualLeaveExtraDays: 6, status: 'ishlamoqda',
    ...(employee && Object.fromEntries(Object.entries(employee).filter(([, v]) => v !== null).map(([k, v]) => [k, ['birthDate', 'passportGivenDate', 'hireDate', 'contractDate'].includes(k) ? toInput(v as string) : v]))),
  }));
  const set = (k: string) => (e: React.ChangeEvent<any>) => setF({ ...f, [k]: e.target.value });

  const departments = useQuery({ queryKey: ['departments'], queryFn: () => api<any[]>('/departments') });
  const positions = useQuery({
    queryKey: ['positions', f.departmentId], enabled: !!f.departmentId,
    queryFn: () => api<any[]>(`/positions?departmentId=${f.departmentId}`),
  });

  const save = useMutation({
    mutationFn: () => {
      const num = ['probationMonths', 'salary', 'annualLeaveBasicDays', 'annualLeaveExtraDays'];
      const body: any = {};
      for (const k of ['tabNumber', 'lastName', 'firstName', 'middleName', 'birthDate', 'birthPlace', 'gender', 'nationality', 'partyMembership', 'phone', 'addressResidential', 'pinfl', 'passportSeriesNumber', 'passportGivenDate', 'passportGivenBy', 'departmentId', 'positionId', 'employmentType', 'hireDate', 'contractNumber', 'contractDate', 'contractDurationType', 'status', ...num]) {
        if (f[k] !== '' && f[k] !== undefined) body[k] = num.includes(k) ? Number(f[k]) : f[k];
      }
      return employee
        ? api(`/employees/${employee.id}`, { method: 'PATCH', body: JSON.stringify(body) })
        : api('/employees', { method: 'POST', body: JSON.stringify(body) });
    },
    onSuccess: (r: any) => {
      qc.invalidateQueries({ queryKey: ['employees'] }); qc.invalidateQueries({ queryKey: ['employee'] }); qc.invalidateQueries({ queryKey: ['stats'] });
      onClose();
      if (!employee) navigate(`/employees/${r.id}`);
    },
  });

  const inp = (k: string, label: string, type = 'text') => (
    <Field label={label}><input className="input" type={type} value={f[k]} onChange={set(k)} /></Field>
  );

  return (
    <Modal title={employee ? 'Xodimni tahrirlash' : 'Yangi xodim'} onClose={onClose} wide>
      <form className="grid gap-4 sm:grid-cols-3" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
        {inp('tabNumber', 'Tabel raqami *')}{inp('lastName', 'Familiya *')}{inp('firstName', 'Ism *')}
        {inp('middleName', 'Otasining ismi')}{inp('birthDate', "Tug'ilgan sana", 'date')}{inp('birthPlace', "Tug'ilgan joy")}
        <Field label="Jinsi"><select className="input" value={f.gender} onChange={set('gender')}><option value="">—</option><option value="erkak">Erkak</option><option value="ayol">Ayol</option></select></Field>
        {inp('nationality', 'Millati')}{inp('partyMembership', 'Partiyaviyligi')}
        {inp('phone', 'Telefon')}{inp('pinfl', 'JSHSHIR (14 ta raqam)')}{inp('passportSeriesNumber', 'Pasport seriya/raqam')}
        {inp('passportGivenDate', 'Pasport berilgan sana', 'date')}
        <div className="sm:col-span-2">{inp('passportGivenBy', 'Pasport kim tomonidan berilgan')}</div>
        <div className="sm:col-span-3">{inp('addressResidential', 'Yashash manzili')}</div>
        <Field label="Bo'lim *"><select required className="input" value={f.departmentId} onChange={(e) => setF({ ...f, departmentId: e.target.value, positionId: '' })}><option value="">Tanlang</option>{departments.data?.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></Field>
        <Field label="Lavozim *"><select required className="input" value={f.positionId} onChange={set('positionId')} disabled={!f.departmentId}><option value="">Tanlang</option>{positions.data?.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}</select></Field>
        <Field label="Ish turi"><select className="input" value={f.employmentType} onChange={set('employmentType')}><option value="shtat">Shtat</option><option value="gpx">GPX (shartnoma)</option></select></Field>
        {inp('hireDate', 'Ishga qabul sanasi', 'date')}{inp('contractNumber', 'Shartnoma raqami')}{inp('contractDate', 'Shartnoma sanasi', 'date')}
        <Field label="Shartnoma muddati"><select className="input" value={f.contractDurationType} onChange={set('contractDurationType')}><option value="muddatsiz">Muddatsiz</option><option value="muddatli">Muddatli</option></select></Field>
        {inp('probationMonths', 'Sinov muddati (oy)', 'number')}{inp('salary', "Oylik maosh (so'm)", 'number')}
        {inp('annualLeaveBasicDays', "Asosiy ta'til (kun)", 'number')}{inp('annualLeaveExtraDays', "Qo'shimcha ta'til (kun)", 'number')}
        <Field label="Holat"><select className="input" value={f.status} onChange={set('status')}><option value="ishlamoqda">Ishlamoqda</option><option value="tatilda">Ta'tilda</option><option value="ishdan_boshagan">Ishdan bo'shagan</option></select></Field>
        {save.error && <p className="text-sm text-brand sm:col-span-3">{(save.error as Error).message}</p>}
        <div className="flex justify-end gap-2 sm:col-span-3">
          <button type="button" className="btn-secondary" onClick={onClose}>Bekor qilish</button>
          <button className="btn-primary" disabled={save.isPending}>Saqlash</button>
        </div>
      </form>
    </Modal>
  );
}
