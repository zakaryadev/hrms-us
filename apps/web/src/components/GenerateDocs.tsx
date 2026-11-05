import DeleteDocButton from './DeleteDocButton';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, FilePlus2, Pencil, Plus, Save } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { transliterate } from '../lib/translit';
import { api, fmtDate, onUnauthorized } from '../lib/api';
import { Empty, Field, Modal, SectionTitle } from './ui';
import { Button, Checkbox, DatePicker, Input, Select, Textarea, buttonStyles, cn } from './kit';

export type DocType = 'obyektivka' | 'ariza' | 'kelishuv' | 'buyruq-otkazish' | 'buyruq-tatil' | 'buyruq-qabul' | 'buyruq-bosh' | 'buyruq-rag';
type Edit = { id: string; params: any };
type Lang = 'cyr' | 'lat' | 'lat-new';

const DOCS: { type: DocType; title: string; desc: string }[] = [
  { type: 'obyektivka', title: 'Маълумотнома (Т-2)', desc: 'Объективка: шахсий маълумот, меҳнат фаолияти, қариндошлар' },
  { type: 'ariza', title: 'Бошқа ишга ўтиш аризаси', desc: 'Ходим номидан ариза' },
  { type: 'kelishuv', title: 'Қўшимча келишув', desc: 'Меҳнат шартномасига (рақам автоматик)' },
  { type: 'buyruq-otkazish', title: 'Лавозимга ўтказиш буйруғи', desc: 'Бошқа ишга доимий ўтказиш' },
  { type: 'buyruq-tatil', title: 'Меҳнат таътили буйруғи', desc: 'Байрам кунлари ҳисоби билан' },
  { type: 'buyruq-qabul', title: 'Ишга қабул буйруғи', desc: 'Қабул санаси, ойлик ва синов муддати' },
  { type: 'buyruq-bosh', title: 'Ишдан бўшатиш буйруғи', desc: 'Сақланганда ходим архивга ўтади' },
  { type: 'buyruq-rag', title: 'Рағбатлантириш буйруғи', desc: 'Миннатдорчилик, пул мукофоти ва ҳ.к.' },
];
const TYPE_LABEL = Object.fromEntries(DOCS.map((d) => [d.type, d.title]));
const today = () => new Date().toISOString().slice(0, 10);

export default function GenerateDocs({ employee }: { employee: any }) {
  const [open, setOpen] = useState<DocType | null>(null);
  const [edit, setEdit] = useState<{ type: DocType; edit: Edit } | null>(null);
  const { user } = useAuth();
  const canEdit = user?.role !== 'buxgalter';
  const history = useQuery({ queryKey: ['generated', employee.id], queryFn: () => api<any[]>(`/employees/${employee.id}/generated`) });
  return (
    <div className="space-y-4">
      {canEdit && <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {DOCS.map((d) => (
          <button key={d.type} onClick={() => setOpen(d.type)} className="card flex items-start gap-3 p-4 text-left transition-colors hover:border-brand hover:bg-brand-soft/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40">
            <FilePlus2 className="mt-0.5 shrink-0 text-brand" size={20} />
            <span><span className="block text-sm font-semibold">{d.title}</span><span className="text-xs text-slate-500">{d.desc}</span></span>
          </button>
        ))}
      </div>}
      <div className="mt-8">
        <h3 className="eyebrow mb-2">Яратилган ҳужжатлар</h3>
        <ul className="divide-y">
          {history.data?.map((g) => (
            <li key={g.id} className="flex items-center gap-3 py-2.5 text-sm">
              <span className="font-medium">{TYPE_LABEL[g.type] ?? g.type}</span>
              {g.number && <span className="text-slate-500">№ {g.number}</span>}
              <span className="text-slate-500">{fmtDate(g.createdAt)}</span>
              <a className={cn(buttonStyles({ variant: 'secondary', size: 'sm' }), 'ml-auto')} href={`/api/documents/generated/${g.id}/download`}><Download size={14} /> DOCX</a>
              {canEdit && <button aria-label="Таҳрирлаш" title="Таҳрирлаш" className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700" onClick={() => setEdit({ type: g.type, edit: { id: g.id, params: g.payload ?? {} } })}><Pencil size={16} /></button>}
              <DeleteDocButton id={g.id} label={TYPE_LABEL[g.type] ?? 'Ҳужжат'} />
            </li>
          ))}
          {history.data?.length === 0 && <li><Empty>Ҳали ҳужжат яратилмаган</Empty></li>}
        </ul>
      </div>
      {open === 'buyruq-tatil'
        ? <LeaveModal employee={employee} onClose={() => setOpen(null)} />
        : open && <DocModal type={open} employee={employee} onClose={() => setOpen(null)} />}
      {edit && (edit.type === 'buyruq-tatil'
        ? <LeaveModal employee={employee} edit={edit.edit} onClose={() => setEdit(null)} />
        : <DocModal type={edit.type as Exclude<DocType, 'buyruq-tatil'>} employee={employee} edit={edit.edit} onClose={() => setEdit(null)} />)}
    </div>
  );
}

/** Умумий: генерация сўрови. save=false бўлса ҳужжат базага ёзилмайди, файл шу заҳоти юкланади. */
function useGenerate(type: DocType, employee: any, onClose: () => void, save: boolean, lang: Lang, build: () => Record<string, any>, edit?: Edit) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const params = { ...build(), lang, ...(save || edit ? {} : { save: false }) };
      const res = await fetch(edit ? `/api/documents/generated/${edit.id}` : `/api/documents/generate/${type}`, {
        method: edit ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(edit ? { params } : { employeeId: employee.id, params }),
      });
      if (res.status === 401) onUnauthorized();
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((Array.isArray(body.message) ? body.message.join(', ') : body.message) || `Хатолик (${res.status})`);
      }
      if (save || edit) return (await res.json()) as { downloadUrl: string };
      const name = /filename="([^"]+)"/.exec(res.headers.get('Content-Disposition') ?? '')?.[1] ?? `${type}.docx`;
      const url = URL.createObjectURL(await res.blob());
      Object.assign(document.createElement('a'), { href: url, download: name }).click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      return null;
    },
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ['generated'] }); qc.invalidateQueries({ queryKey: ['orders'] }); qc.invalidateQueries({ queryKey: ['timesheet'] }); qc.invalidateQueries({ queryKey: ['stats'] });
      if (r && !edit) window.location.href = r.downloadUrl;
      onClose();
    },
  });
}

function LangPicker({ lang, setLang }: { lang: Lang; setLang: (l: Lang) => void }) {
  return (
    <div className="flex justify-end">
      <label className="flex items-center gap-2 text-sm text-slate-600">
        Ҳужжат тили
        <Select className="!h-8 !w-auto !px-2 text-xs" value={lang} onChange={(v) => setLang(v as Lang)}>
          <option value="cyr">Кирилл</option><option value="lat">Лотин</option><option value="lat-new">Лотин (янги алифбо)</option>
        </Select>
      </label>
    </div>
  );
}

function ModalFooter({ save, setSave, pending, error, onClose, editing }: {
  save: boolean; setSave: (v: boolean) => void; pending: boolean; error: Error | null; onClose: () => void; editing?: boolean;
}) {
  return (
    <div className="mt-2 space-y-3 border-t pt-4">
      {error && <p className="text-sm text-red-600">{error.message}</p>}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {editing ? <span className="text-xs text-slate-500">Ҳужжат файли ва рақами шу ёзув устига янгиланади.</span>
          : <Checkbox checked={save} onChange={setSave}>Ҳужжатни сақлаш ҳамда юклаб олинган ҳужжатлар рўйхатига қўшиш</Checkbox>}
        <div className="ml-auto flex gap-2">
          <Button variant="secondary" type="button"  onClick={onClose}>Бекор қилиш</Button>
          <Button variant="primary" disabled={pending}>{editing ? <><Save size={16} /> Сақлаш</> : <><Plus size={16} /> Докх шаклида олиш</>}</Button>
        </div>
      </div>
    </div>
  );
}

/** Ариза, келишув, ўтказиш буйруғи, маълумотнома */
export function DocModal({ type, employee, onClose, edit }: { type: Exclude<DocType, 'buyruq-tatil'>; employee: any; onClose: () => void; edit?: Edit }) {
  const [f, setF] = useState<any>({
    newDepartmentId: '', newPositionId: '', transferDate: '', applicationDate: today(), agreementDate: today(),
    newSalary: '', poaText: '', orderNumber: '', orderDate: today(), basis: '', malumoti: '', harbiyUnvoni: '',
    hireDate: employee.hireDate?.slice(0, 10) ?? '', salary: employee.salary != null ? String(Number(employee.salary)) : '', probationMonths: String(employee.probationMonths ?? 0),
    dismissalDate: '', compensation: false, reason: '', rewardText: '', amount: '',
    ...Object.fromEntries(Object.entries(edit?.params ?? {}).map(([k, v]) => [k, typeof v === 'number' ? String(v) : v])),
  });
  const [save, setSave] = useState(true);
  const [lang, setLang] = useState<Lang>(edit?.params?.lang === 'lat' || edit?.params?.lang === 'lat-new' ? edit.params.lang : 'cyr');
  const set = (k: string) => (e: React.ChangeEvent<any>) => setF({ ...f, [k]: e.target.value });
  const needsTarget = ['ariza', 'kelishuv', 'buyruq-otkazish'].includes(type);

  const departments = useQuery({ queryKey: ['departments'], queryFn: () => api<any[]>('/departments') });
  const positions = useQuery({ queryKey: ['positions', f.newDepartmentId], enabled: !!f.newDepartmentId, queryFn: () => api<any[]>(`/positions?departmentId=${f.newDepartmentId}`) });
  const settings = useQuery({ queryKey: ['settings'], queryFn: () => api<any>('/settings'), enabled: type === 'kelishuv' });

  const submit = useGenerate(type, employee, onClose, save, lang, () => {
    const params: any = {};
    const copy = (...keys: string[]) => keys.forEach((k) => f[k] !== '' && (params[k] = f[k]));
    if (needsTarget) copy('newDepartmentId', 'newPositionId', 'transferDate');
    if (type === 'ariza') copy('applicationDate');
    if (type === 'kelishuv') { copy('agreementDate', 'poaText'); params.newSalary = Number(f.newSalary); }
    if (type === 'buyruq-otkazish') copy('orderNumber', 'orderDate', 'basis');
    if (type === 'buyruq-qabul') { copy('orderNumber', 'orderDate', 'hireDate', 'basis'); params.salary = Number(f.salary) || 0; params.probationMonths = Number(f.probationMonths) || 0; }
    if (type === 'buyruq-bosh') { copy('orderNumber', 'orderDate', 'dismissalDate', 'basis'); params.compensation = !!f.compensation; }
    if (type === 'buyruq-rag') { copy('orderNumber', 'orderDate', 'reason', 'rewardText', 'basis'); if (f.amount !== '') params.amount = Number(f.amount); }
    return params;
  }, edit);

  const cur = `${employee.department.name}, ${employee.position.title}`;
  return (
    <Modal title={TYPE_LABEL[type]} onClose={onClose} wide>
      <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); submit.mutate(); }}>
        <LangPicker lang={lang} setLang={setLang} />
        <section><Field label="Ходим"><Textarea rows={2} className="bg-slate-50" readOnly value={`${employee.lastName} ${employee.firstName} — ${cur}`} /></Field></section>

        {needsTarget && (
          <section>
            <SectionTitle>Янги иш жойи</SectionTitle>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <Field label="Янги филиал / ҳудуд *"><Select required value={f.newDepartmentId} onChange={(v) => setF({ ...f, newDepartmentId: v, newPositionId: '' })}><option value="">Танланг</option>{departments.data?.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</Select></Field>
              <Field label="Янги лавозим *"><Select required disabled={!f.newDepartmentId} value={f.newPositionId}
                onChange={(v) => { const p = positions.data?.find((x) => x.id === v); setF({ ...f, newPositionId: v, newSalary: type === 'kelishuv' && p ? Number(p.baseSalary) : f.newSalary }); }}>
                <option value="">Танланг</option>{positions.data?.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}</Select></Field>
              <Field label="Ўтказиш санаси *"><DatePicker required value={f.transferDate} onChange={(v) => setF({ ...f, transferDate: v })} /></Field>
            </div>
          </section>
        )}

        {type === 'ariza' && (
          <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Field label="Ариза санаси *"><DatePicker required value={f.applicationDate} onChange={(v) => setF({ ...f, applicationDate: v })} /></Field>
          </section>
        )}

        {type === 'kelishuv' && (
          <section>
            <SectionTitle>Келишув</SectionTitle>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <Field label="Шартнома"><Input className="bg-slate-50" readOnly value={employee.contractNumber ? `${employee.contractNumber} (${fmtDate(employee.contractDate)})` : 'Киритилмаган!'} /></Field>
              <Field label="Келишув тузилган сана *"><DatePicker required value={f.agreementDate} onChange={(v) => setF({ ...f, agreementDate: v })} /></Field>
              <Field label="Янги ойлик иш ҳақи (сўм) *"><Input required type="number" min={0} value={f.newSalary} onChange={set('newSalary')} /></Field>
              <div className="md:col-span-3"><Field label="Ишончнома реквизитлари"><Input placeholder={settings.data?.ishonchnoma_matni} value={f.poaText} onChange={set('poaText')} /></Field></div>
            </div>
            <p className="mt-2 text-xs text-slate-500">Келишув рақами автоматик берилади (ходим бўйича 1, 2, …).</p>
          </section>
        )}

        {type === 'buyruq-otkazish' && (
          <section>
            <SectionTitle>Буйруқ</SectionTitle>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <Field label="Буйруқ рақами"><Input translit={false} placeholder="Бўш қолса автоматик" value={f.orderNumber} onChange={set('orderNumber')} /></Field>
              <Field label="Буйруқ санаси *"><DatePicker required value={f.orderDate} onChange={(v) => setF({ ...f, orderDate: v })} /></Field>
              <div className="md:col-span-3"><Field label="Асос *"><Textarea required rows={3} placeholder="Ходимнинг аризаси, қўшимча келишув ҳамда ЎзР Меҳнат кодексининг 138, 140-моддалари" value={f.basis} onChange={set('basis')} /></Field></div>
            </div>
          </section>
        )}

        {type === 'buyruq-qabul' && (
          <section>
            <SectionTitle>Ишга қабул</SectionTitle>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <Field label="Буйруқ рақами"><Input translit={false} placeholder="Бўш қолса автоматик" value={f.orderNumber} onChange={set('orderNumber')} /></Field>
              <Field label="Буйруқ санаси *"><DatePicker required value={f.orderDate} onChange={(v) => setF({ ...f, orderDate: v })} /></Field>
              <Field label="Ишга қабул санаси *"><DatePicker required value={f.hireDate} onChange={(v) => setF({ ...f, hireDate: v })} /></Field>
              <Field label="Ойлик иш ҳақи (сўм)"><Input type="number" min={0} value={f.salary} onChange={set('salary')} /></Field>
              <Field label="Синов муддати (ой)"><Input type="number" min={0} value={f.probationMonths} onChange={set('probationMonths')} /></Field>
              <div className="md:col-span-3"><Field label="Асос"><Textarea rows={2} placeholder="Бўш қолса: ходимнинг аризаси ва меҳнат шартномаси" value={f.basis} onChange={set('basis')} /></Field></div>
            </div>
          </section>
        )}

        {type === 'buyruq-bosh' && (
          <section>
            <SectionTitle>Ишдан бўшатиш</SectionTitle>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <Field label="Буйруқ рақами"><Input translit={false} placeholder="Бўш қолса автоматик" value={f.orderNumber} onChange={set('orderNumber')} /></Field>
              <Field label="Буйруқ санаси *"><DatePicker required value={f.orderDate} onChange={(v) => setF({ ...f, orderDate: v })} /></Field>
              <Field label="Бўшатиш санаси *"><DatePicker required value={f.dismissalDate} onChange={(v) => setF({ ...f, dismissalDate: v })} /></Field>
              <div className="md:col-span-3"><Field label="Асос *"><Textarea required rows={2} placeholder="Ходимнинг аризаси ва ЎзР Меҳнат кодексининг 99-моддаси" value={f.basis} onChange={set('basis')} /></Field></div>
              <div className="md:col-span-3"><Checkbox checked={!!f.compensation} onChange={(v) => setF({ ...f, compensation: v })}>Фойдаланилмаган таътил учун пул компенсацияси тўлансин</Checkbox></div>
            </div>
            {!edit && <p className="mt-2 text-xs font-medium text-amber-700">Ҳужжат сақланганда ходим автоматик «Архив»га ўтказилади (ишдан бўшаган).</p>}
          </section>
        )}

        {type === 'buyruq-rag' && (
          <section>
            <SectionTitle>Рағбатлантириш</SectionTitle>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <Field label="Буйруқ рақами"><Input translit={false} placeholder="Бўш қолса автоматик" value={f.orderNumber} onChange={set('orderNumber')} /></Field>
              <Field label="Буйруқ санаси *"><DatePicker required value={f.orderDate} onChange={(v) => setF({ ...f, orderDate: v })} /></Field>
              <Field label="Пул мукофоти (сўм)"><Input type="number" min={0} value={f.amount} onChange={set('amount')} /></Field>
              <div className="md:col-span-3"><Field label="Нима учун *"><Input required placeholder="намунали меҳнат ва юқори натижаларга эришгани" value={f.reason} onChange={set('reason')} /></Field></div>
              <div className="md:col-span-3"><Field label="Рағбатлантириш тури (пул мукофотидан ташқари)"><Input placeholder="Миннатдорчилик эълон қилинсин" value={f.rewardText} onChange={set('rewardText')} /></Field></div>
              <div className="md:col-span-3"><Field label="Асос *"><Textarea required rows={2} value={f.basis} onChange={set('basis')} /></Field></div>
            </div>
            <p className="mt-2 text-xs text-slate-500">Камида биттаси керак: рағбатлантириш тури ёки пул мукофоти.</p>
          </section>
        )}

        {type === 'obyektivka' && (
          <section className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            <p>Барча маълумот (маълумоти, чет тиллари, илмий даража ва унвон, ҳарбий унвон, мукофотлар, депутатлик, меҳнат фаолияти, қариндошлар ва фото) <b>ходим профилидан</b> автоматик олинади.</p>
            <p className="mt-1 text-xs text-slate-500">Ўзгартириш ёки тўлдириш: ходим саҳифасида «Таҳрирлаш» → «Қўшимча маълумотлар». Бўш қолган майдонлар учун «йўқ» ёзилади.</p>
          </section>
        )}

        <ModalFooter save={save} setSave={setSave} pending={submit.isPending} error={submit.error as Error | null} onClose={onClose} editing={!!edit} />
      </form>
    </Modal>
  );
}

const DEFAULTS = {
  cyr: {
    basis: 'ЎзР Меҳнат кодексининг 216, 217, 221-моддалари ҳамда ходимнинг аризаси',
    signer: 'Бош директорнинг кадрлар фаолиятини мувофиқлаштириш бўйича ўринбосари',
  },
  lat: {
    basis: "O'zR Mehnat kodeksining 216, 217, 221-moddalari hamda xodimning arizasi",
    signer: "Bosh direktorning kadrlar faoliyatini muvofiqlashtirish bo'yicha o'rinbosari",
  },
};

/** «Меҳнат таътили бериш ҳақида буйруқ» */
export function LeaveModal({ employee, onClose, edit }: { employee: any; onClose: () => void; edit?: Edit }) {
  const ep = edit?.params ?? {};
  const [f, setF] = useState({
    workYearStart: '', workYearEnd: '', startDate: '', basicDays: String(employee.annualLeaveBasicDays), extraDays: String(employee.annualLeaveExtraDays),
    basis: '', signer: '', orderDate: today(), orderNumber: '',
    ...Object.fromEntries(['workYearStart', 'workYearEnd', 'startDate', 'basis', 'signer', 'orderDate', 'orderNumber'].filter((k) => ep[k]).map((k) => [k, ep[k]])),
    ...(ep.basicDays != null && { basicDays: String(ep.basicDays) }), ...(ep.extraDays != null && { extraDays: String(ep.extraDays) }),
  });
  const [save, setSave] = useState(true);
  const [lang, setLang] = useState<Lang>(ep.lang === 'lat' || ep.lang === 'lat-new' ? ep.lang : 'cyr');
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<any>) => setF({ ...f, [k]: e.target.value });
  const settings = useQuery({ queryKey: ['settings'], queryFn: () => api<any>('/settings') });
  const days = (Number(f.basicDays) || 0) + (Number(f.extraDays) || 0);
  const calc = useQuery({
    queryKey: ['leave', f.startDate, days, employee.hireDate],
    enabled: !!f.startDate && days > 0,
    queryFn: () => api<any>(`/leave/calc?start=${f.startDate}&days=${days}${employee.hireDate ? `&hireDate=${employee.hireDate.slice(0, 10)}` : ''}`),
    retry: false,
  });
  // Иш йили: фойдаланувчи ўзгартирмагунча — автоматик (қабул санаси ва таътил бошланишидан)
  const wyStart = f.workYearStart || calc.data?.workYear?.start || '';
  const wyEnd = f.workYearEnd || calc.data?.workYear?.end || '';
  // янги алифбо учун асос/имзоловчи матнлари лотиндан ўгирилади
  const D = lang === 'lat-new' ? { basis: transliterate(DEFAULTS.lat.basis, 'lat-new'), signer: transliterate(DEFAULTS.lat.signer, 'lat-new') } : DEFAULTS[lang];

  const submit = useGenerate('buyruq-tatil', employee, onClose, save, lang, () => ({
    startDate: f.startDate, orderDate: f.orderDate, basicDays: Number(f.basicDays) || 0, extraDays: Number(f.extraDays) || 0,
    ...(wyStart && { workYearStart: wyStart }), ...(wyEnd && { workYearEnd: wyEnd }),
    basis: f.basis || D.basis, signer: f.signer || D.signer, ...(f.orderNumber && { orderNumber: f.orderNumber }),
  }), edit);

  const s = settings.data;
  const fullName = [employee.lastName, employee.firstName, employee.middleName].filter(Boolean).join(' ');
  const unit = [employee.department.parent?.name, employee.department.name].filter(Boolean).join(', ');
  const ro = 'input bg-slate-50 text-slate-700';

  return (
    <Modal title="Меҳнат таътили бериш ҳақида буйруқ" onClose={onClose} wide>
      <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); submit.mutate(); }}>
        <LangPicker lang={lang} setLang={setLang} />
        <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Кимга"><Textarea rows={2} className={ro} readOnly value={s ? `«${s.tashkilot_nomi}» бош директори ${s.bosh_direktor_fish}га` : ''} /></Field>
          <Field label="Кимдан"><Textarea rows={2} className={ro} readOnly value={`${fullName} — ${unit}, ${employee.position.title}`} /></Field>
        </section>

        <section>
          <SectionTitle>Саналар ва муддатлар</SectionTitle>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Field label="Иш йили бошланиши"><DatePicker value={wyStart} onChange={(v) => setF({ ...f, workYearStart: v })} /></Field>
            <Field label="Иш йили тугаши"><DatePicker value={wyEnd} onChange={(v) => setF({ ...f, workYearEnd: v })} /></Field>
            <Field label="Бошланиши *"><DatePicker required value={f.startDate} onChange={(v) => setF({ ...f, startDate: v })} /></Field>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Field label="Асосий таътил куни"><Input type="number" min={0} value={f.basicDays} onChange={set('basicDays')} /></Field>
          <Field label="Қўшимча таътил куни"><Input type="number" min={0} value={f.extraDays} onChange={set('extraDays')} /></Field>
          <Field label="Жами календар кун"><Input className={ro} readOnly value={days} /></Field>
        </section>

        <section className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Тугаши"><div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold">{calc.data ? fmtDate(calc.data.endDate) : '—'}</div></Field>
            <Field label="Ишга чиқиш куни"><div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold">{calc.data ? fmtDate(calc.data.returnDate) : '—'}</div></Field>
          </div>
          {calc.data?.holidaysInRange.length > 0 && (
            <p className="mt-2 text-xs font-medium text-red-600">Байрам кунлари сабабли узайтирилди: {calc.data.holidaysInRange.map((d: string) => fmtDate(d)).join(', ')}</p>
          )}
          {!f.startDate && <p className="mt-2 text-xs text-slate-500">Бошланиш санасини танланг — тугаш ва ишга чиқиш санаси автоматик ҳисобланади.</p>}
        </section>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="md:col-span-2"><Field label="Асос"><Textarea rows={2} placeholder="Меҳнат кодексининг 217, 219... моддалари ҳамда ходим аризаси" value={f.basis || D.basis} onChange={set('basis')} /></Field></div>
          <Field label="Имзоловчи"><Textarea rows={2} value={f.signer || D.signer} onChange={set('signer')} /></Field>
          <Field label="Буйруқ санаси"><DatePicker required value={f.orderDate} onChange={(v) => setF({ ...f, orderDate: v })} /></Field>
          <Field label="Буйруқ рақами"><Input translit={false} placeholder="Бўш қолса автоматик" value={f.orderNumber} onChange={set('orderNumber')} /></Field>
        </section>

        <ModalFooter save={save} setSave={setSave} pending={submit.isPending} error={submit.error as Error | null} onClose={onClose} editing={!!edit} />
      </form>
    </Modal>
  );
}
