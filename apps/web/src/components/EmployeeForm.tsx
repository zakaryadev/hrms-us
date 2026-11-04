import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Save } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { Field, Modal, SectionTitle } from './ui';

const DATE_KEYS = ['birthDate', 'passportGivenDate', 'hireDate', 'contractDate'];
const NUM_KEYS = ['probationMonths', 'salary', 'annualLeaveBasicDays', 'annualLeaveExtraDays'];
const ALL_KEYS = ['tabNumber', 'lastName', 'firstName', 'middleName', 'birthDate', 'birthPlace', 'gender', 'nationality', 'partyMembership', 'phone', 'addressResidential', 'pinfl', 'passportSeriesNumber', 'passportGivenDate', 'passportGivenBy', 'departmentId', 'positionId', 'employmentType', 'hireDate', 'contractNumber', 'contractDate', 'contractDurationType', 'status', ...NUM_KEYS];
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
    ...(employee && Object.fromEntries(Object.entries(employee).filter(([, v]) => v !== null).map(([k, v]) => [k, DATE_KEYS.includes(k) ? toInput(v as string) : v]))),
  }));
  const set = (k: string) => (e: React.ChangeEvent<any>) => setF({ ...f, [k]: e.target.value });

  const departments = useQuery({ queryKey: ['departments'], queryFn: () => api<any[]>('/departments') });
  const positions = useQuery({
    queryKey: ['positions', f.departmentId], enabled: !!f.departmentId,
    queryFn: () => api<any[]>(`/positions?departmentId=${f.departmentId}`),
  });

  const save = useMutation({
    mutationFn: () => {
      const body: any = {};
      for (const k of ALL_KEYS) if (f[k] !== '' && f[k] !== undefined) body[k] = NUM_KEYS.includes(k) ? Number(f[k]) : f[k];
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

  const inp = (k: string, label: string, type = 'text', required = false) => (
    <Field label={label + (required ? ' *' : '')}><input required={required} className="input" type={type} value={f[k]} onChange={set(k)} /></Field>
  );
  const sel = (k: string, label: string, opts: [string, string][], empty?: string) => (
    <Field label={label}><select className="input" value={f[k]} onChange={set(k)}>{empty !== undefined && <option value="">{empty}</option>}{opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Field>
  );

  return (
    <Modal title={employee ? 'Ходимни таҳрирлаш' : 'Янги ходим'} onClose={onClose} wide>
      <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
        <section>
          <SectionTitle>Шахсий маълумотлар</SectionTitle>
          <div className="grid gap-4 md:grid-cols-3">
            {inp('tabNumber', 'Табель рақами', 'text', true)}{inp('lastName', 'Фамилия', 'text', true)}{inp('firstName', 'Исм', 'text', true)}
            {inp('middleName', 'Отасининг исми')}{inp('birthDate', 'Туғилган санаси', 'date')}{inp('birthPlace', 'Туғилган жойи')}
            {sel('gender', 'Жинси', [['erkak', 'Эркак'], ['ayol', 'Аёл']], '—')}{inp('nationality', 'Миллати')}{inp('partyMembership', 'Партиявийлиги')}
            {inp('phone', 'Телефон')}
            <div className="md:col-span-2">{inp('addressResidential', 'Яшаш манзили')}</div>
          </div>
        </section>

        <section>
          <SectionTitle>Паспорт</SectionTitle>
          <div className="grid gap-4 md:grid-cols-3">
            {inp('pinfl', 'ЖШШИР (14 та рақам)')}{inp('passportSeriesNumber', 'Паспорт серия ва рақами')}{inp('passportGivenDate', 'Берилган санаси', 'date')}
            <div className="md:col-span-3">{inp('passportGivenBy', 'Ким томонидан берилган')}</div>
          </div>
        </section>

        <section>
          <SectionTitle>Иш жойи ва шартнома</SectionTitle>
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Бўлим *"><select required className="input" value={f.departmentId} onChange={(e) => setF({ ...f, departmentId: e.target.value, positionId: '' })}><option value="">Танланг</option>{departments.data?.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></Field>
            <Field label="Лавозим *"><select required className="input" value={f.positionId} onChange={set('positionId')} disabled={!f.departmentId}><option value="">Танланг</option>{positions.data?.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}</select></Field>
            {sel('employmentType', 'Иш тури', [['shtat', 'Штат'], ['gpx', 'ГПХ (шартнома)']])}
            {inp('hireDate', 'Ишга қабул санаси', 'date')}{inp('contractNumber', 'Шартнома рақами')}{inp('contractDate', 'Шартнома санаси', 'date')}
            {sel('contractDurationType', 'Шартнома муддати', [['muddatsiz', 'Муддатсиз'], ['muddatli', 'Муддатли']])}
            {inp('probationMonths', 'Синов муддати (ой)', 'number')}{inp('salary', 'Ойлик маош (сўм)', 'number')}
            {inp('annualLeaveBasicDays', 'Асосий таътил (кун)', 'number')}{inp('annualLeaveExtraDays', 'Қўшимча таътил (кун)', 'number')}
            {sel('status', 'Ҳолат', [['ishlamoqda', 'Ишлаяпти'], ['tatilda', 'Таътилда'], ['ishdan_boshagan', 'Ишдан бўшаган']])}
          </div>
        </section>

        <div className="mt-2 space-y-3 border-t pt-4">
          {save.error && <p className="text-sm text-red-600">{(save.error as Error).message}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-secondary" onClick={onClose}>Бекор қилиш</button>
            <button className="btn-primary" disabled={save.isPending}><Save size={16} /> Сақлаш</button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
