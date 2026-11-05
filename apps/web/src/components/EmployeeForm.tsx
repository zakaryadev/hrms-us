import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Save } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, deletePhoto, photoSrc, uploadPhoto } from '../lib/api';
import { Field, Modal, SectionTitle } from './ui';
import { Button, DatePicker, ImageUploader, Input, Select } from './kit';

const DATE_KEYS = ['birthDate', 'passportGivenDate', 'hireDate', 'contractDate'];
const NUM_KEYS = ['probationMonths', 'salary', 'annualLeaveBasicDays', 'annualLeaveExtraDays'];
const ALL_KEYS = ['tabNumber', 'lastName', 'firstName', 'middleName', 'birthDate', 'birthPlace', 'gender', 'nationality', 'partyMembership', 'educationLevel', 'foreignLanguages', 'academicDegree', 'academicTitle', 'militaryRank', 'stateAwards', 'deputyStatus', 'phone', 'addressResidential', 'pinfl', 'passportSeriesNumber', 'passportGivenDate', 'passportGivenBy', 'departmentId', 'positionId', 'employmentType', 'hireDate', 'contractNumber', 'contractDate', 'contractDurationType', 'status', ...NUM_KEYS];
const T2_KEYS = ['educationLevel', 'foreignLanguages', 'academicDegree', 'academicTitle', 'militaryRank', 'stateAwards', 'deputyStatus'];
const toInput = (d?: string | null) => (d ? d.slice(0, 10) : '');

export default function EmployeeForm({ employee, onClose }: { employee?: any; onClose: () => void }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [f, setF] = useState<any>(() => ({
    tabNumber: '', lastName: '', firstName: '', middleName: '', birthDate: '', birthPlace: '', gender: '',
    nationality: '', partyMembership: '', educationLevel: '', foreignLanguages: '', academicDegree: '', academicTitle: '', militaryRank: '', stateAwards: '', deputyStatus: '', phone: '', addressResidential: '', pinfl: '', passportSeriesNumber: '',
    passportGivenDate: '', passportGivenBy: '', departmentId: '', positionId: '', employmentType: 'shtat',
    hireDate: '', contractNumber: '', contractDate: '', contractDurationType: 'muddatsiz', probationMonths: 0,
    salary: 0, annualLeaveBasicDays: 21, annualLeaveExtraDays: 6, status: 'ishlamoqda',
    ...(employee && Object.fromEntries(Object.entries(employee).filter(([, v]) => v !== null).map(([k, v]) => [k, DATE_KEYS.includes(k) ? toInput(v as string) : v]))),
  }));
  const set = (k: string) => (e: React.ChangeEvent<any>) => setF({ ...f, [k]: e.target.value });
  // Расм: сақлаш тугмасида ходим билан бирга юборилади
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoRemoved, setPhotoRemoved] = useState(false);
  const [photoError, setPhotoError] = useState('');
  const [createdId, setCreatedId] = useState<string | null>(null); // расм юкланмаса қайта уриниш ходимни иккинчи марта яратмаслиги учун

  const departments = useQuery({ queryKey: ['departments'], queryFn: () => api<any[]>('/departments') });
  const positions = useQuery({
    queryKey: ['positions', f.departmentId], enabled: !!f.departmentId,
    queryFn: () => api<any[]>(`/positions?departmentId=${f.departmentId}`),
  });

  const save = useMutation({
    mutationFn: async () => {
      const body: any = {};
      for (const k of ALL_KEYS) if (f[k] !== '' && f[k] !== undefined) body[k] = NUM_KEYS.includes(k) ? Number(f[k]) : f[k];
      const existingId = employee?.id ?? createdId;
      // Қўшимча (Т-2) матнларни тозалаш мумкин бўлиши учун таҳрирда бўш қиймат ҳам юборилади
      if (existingId) for (const k of T2_KEYS) if (f[k] === '') body[k] = '';
      let saved: any;
      if (existingId) saved = await api(`/employees/${existingId}`, { method: 'PATCH', body: JSON.stringify(body) });
      else { saved = await api('/employees', { method: 'POST', body: JSON.stringify(body) }); setCreatedId(saved.id); }
      setPhotoError('');
      try {
        if (photoFile) await uploadPhoto(saved.id, photoFile);
        else if (photoRemoved && employee?.photoUrl) await deletePhoto(saved.id);
      } catch (e) {
        setPhotoError(`Ходим сақланди, лекин расм юкланмади: ${(e as Error).message}`);
        throw e;
      }
      return saved;
    },
    onSuccess: (r: any) => {
      qc.invalidateQueries({ queryKey: ['employees'] }); qc.invalidateQueries({ queryKey: ['employee'] }); qc.invalidateQueries({ queryKey: ['stats'] });
      onClose();
      if (!employee) navigate(`/employees/${r.id}`);
    },
    onError: () => { if (createdId || photoError) { qc.invalidateQueries({ queryKey: ['employees'] }); qc.invalidateQueries({ queryKey: ['stats'] }); } },
  });

  const inp = (k: string, label: string, type = 'text', required = false) => (
    <Field label={label + (required ? ' *' : '')}>
      {type === 'date'
        ? <DatePicker required={required} value={f[k]} onChange={(v) => setF({ ...f, [k]: v })} />
        : <Input required={required} type={type} value={f[k]} onChange={set(k)} />}
    </Field>
  );
  const sel = (k: string, label: string, opts: [string, string][], empty?: string) => (
    <Field label={label}><Select value={f[k]} onChange={(v) => setF({ ...f, [k]: v })}>{empty !== undefined && <option value="">{empty}</option>}{opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select></Field>
  );

  return (
    <Modal title={employee ? 'Ходимни таҳрирлаш' : 'Янги ходим'} onClose={onClose} wide>
      <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
        <section>
          <SectionTitle>Шахсий маълумотлар</SectionTitle>
          <ImageUploader className="mb-4" src={photoRemoved ? null : photoSrc(employee?.photoUrl)} error={photoError || null}
            onSelect={(file) => { setPhotoFile(file); setPhotoRemoved(false); setPhotoError(''); }}
            onRemove={() => { setPhotoFile(null); setPhotoRemoved(true); setPhotoError(''); }} />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {inp('tabNumber', 'Табель рақами', 'text', true)}{inp('lastName', 'Фамилия', 'text', true)}{inp('firstName', 'Исм', 'text', true)}
            {inp('middleName', 'Отасининг исми')}{inp('birthDate', 'Туғилган санаси', 'date')}{inp('birthPlace', 'Туғилган жойи')}
            {sel('gender', 'Жинси', [['erkak', 'Эркак'], ['ayol', 'Аёл']], '—')}{inp('nationality', 'Миллати')}{inp('partyMembership', 'Партиявийлиги')}
            {inp('phone', 'Телефон')}
            <div className="md:col-span-2">{inp('addressResidential', 'Яшаш манзили')}</div>
          </div>
        </section>
        <section>
          <SectionTitle>Қўшимча маълумотлар (Т-2 маълумотномага автоматик тушади)</SectionTitle>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {inp('educationLevel', 'Маълумоти (олий, ўрта махсус…)')}{inp('foreignLanguages', 'Қайси чет тилларини билади')}
            {inp('academicDegree', 'Илмий даражаси')}{inp('academicTitle', 'Илмий унвони')}
            {inp('militaryRank', 'Ҳарбий (махсус) унвони')}{inp('stateAwards', 'Давлат мукофотлари (қайси)')}
            <div className="md:col-span-2">{inp('deputyStatus', 'Халқ депутатлари Кенгаши депутатими ёки бошқа сайланадиган орган аъзосими')}</div>
          </div>
          <p className="mt-2 text-xs text-slate-500">Бўш қолдирилса маълумотномада «йўқ» ёзилади.</p>
        </section>

        <section>
          <SectionTitle>Паспорт</SectionTitle>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {inp('pinfl', 'ЖШШИР (14 та рақам)')}{inp('passportSeriesNumber', 'Паспорт серия ва рақами')}{inp('passportGivenDate', 'Берилган санаси', 'date')}
            <div className="md:col-span-3">{inp('passportGivenBy', 'Ким томонидан берилган')}</div>
          </div>
        </section>

        <section>
          <SectionTitle>Иш жойи ва шартнома</SectionTitle>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Field label="Бўлим *"><Select required value={f.departmentId} onChange={(v) => setF({ ...f, departmentId: v, positionId: '' })}><option value="">Танланг</option>{departments.data?.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</Select></Field>
            <Field label="Лавозим *"><Select required value={f.positionId} onChange={(v) => setF({ ...f, positionId: v })} disabled={!f.departmentId}><option value="">Танланг</option>{positions.data?.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}</Select></Field>
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
            <Button variant="secondary" type="button"  onClick={onClose}>Бекор қилиш</Button>
            <Button variant="primary"  disabled={save.isPending}><Save size={16} /> Сақлаш</Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
