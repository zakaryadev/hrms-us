import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, FilePlus2, Plus } from 'lucide-react';
import { useState } from 'react';
import { api, fmtDate, onUnauthorized } from '../lib/api';
import { Empty, Field, Modal, SectionTitle } from './ui';

export type DocType = 'obyektivka' | 'ariza' | 'kelishuv' | 'buyruq-otkazish' | 'buyruq-tatil';
type Lang = 'cyr' | 'lat';

const DOCS: { type: DocType; title: string; desc: string }[] = [
  { type: 'obyektivka', title: 'Маълумотнома (Т-2)', desc: 'Объективка: шахсий маълумот, меҳнат фаолияти, қариндошлар' },
  { type: 'ariza', title: 'Бошқа ишга ўтиш аризаси', desc: 'Ходим номидан ариза' },
  { type: 'kelishuv', title: 'Қўшимча келишув', desc: 'Меҳнат шартномасига (рақам автоматик)' },
  { type: 'buyruq-otkazish', title: 'Лавозимга ўтказиш буйруғи', desc: 'Бошқа ишга доимий ўтказиш' },
  { type: 'buyruq-tatil', title: 'Меҳнат таътили буйруғи', desc: 'Байрам кунлари ҳисоби билан' },
];
const TYPE_LABEL = Object.fromEntries(DOCS.map((d) => [d.type, d.title]));
const today = () => new Date().toISOString().slice(0, 10);

export default function GenerateDocs({ employee }: { employee: any }) {
  const [open, setOpen] = useState<DocType | null>(null);
  const history = useQuery({ queryKey: ['generated', employee.id], queryFn: () => api<any[]>(`/employees/${employee.id}/generated`) });
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {DOCS.map((d) => (
          <button key={d.type} onClick={() => setOpen(d.type)} className="card flex items-start gap-3 p-4 text-left transition hover:border-brand">
            <FilePlus2 className="mt-0.5 shrink-0 text-brand" size={20} />
            <span><span className="block text-sm font-semibold">{d.title}</span><span className="text-xs text-slate-500">{d.desc}</span></span>
          </button>
        ))}
      </div>
      <div className="card p-5">
        <h3 className="mb-2 font-semibold">Яратилган ҳужжатлар</h3>
        <ul className="divide-y">
          {history.data?.map((g) => (
            <li key={g.id} className="flex items-center gap-3 py-2.5 text-sm">
              <span className="font-medium">{TYPE_LABEL[g.type] ?? g.type}</span>
              {g.number && <span className="text-slate-500">№ {g.number}</span>}
              <span className="text-slate-500">{fmtDate(g.createdAt)}</span>
              <a className="btn-secondary ml-auto !px-3 !py-1.5" href={`/api/documents/generated/${g.id}/download`}><Download size={14} /> DOCX</a>
            </li>
          ))}
          {history.data?.length === 0 && <li><Empty>Ҳали ҳужжат яратилмаган</Empty></li>}
        </ul>
      </div>
      {open === 'buyruq-tatil'
        ? <LeaveModal employee={employee} onClose={() => setOpen(null)} />
        : open && <DocModal type={open} employee={employee} onClose={() => setOpen(null)} />}
    </div>
  );
}

/** Умумий: генерация сўрови. save=false бўлса ҳужжат базага ёзилмайди, файл шу заҳоти юкланади. */
function useGenerate(type: DocType, employee: any, onClose: () => void, save: boolean, lang: Lang, build: () => Record<string, any>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const params = { ...build(), lang, ...(save ? {} : { save: false }) };
      const res = await fetch(`/api/documents/generate/${type}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ employeeId: employee.id, params }),
      });
      if (res.status === 401) onUnauthorized();
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((Array.isArray(body.message) ? body.message.join(', ') : body.message) || `Хатолик (${res.status})`);
      }
      if (save) return (await res.json()) as { downloadUrl: string };
      const name = /filename="([^"]+)"/.exec(res.headers.get('Content-Disposition') ?? '')?.[1] ?? `${type}.docx`;
      const url = URL.createObjectURL(await res.blob());
      Object.assign(document.createElement('a'), { href: url, download: name }).click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      return null;
    },
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ['generated'] }); qc.invalidateQueries({ queryKey: ['orders'] });
      if (r) window.location.href = r.downloadUrl;
      onClose();
    },
  });
}

function LangPicker({ lang, setLang }: { lang: Lang; setLang: (l: Lang) => void }) {
  return (
    <div className="flex justify-end">
      <label className="flex items-center gap-2 text-sm text-slate-600">
        Ҳужжат тили
        <select className="input !w-auto !py-1.5" value={lang} onChange={(e) => setLang(e.target.value as Lang)}>
          <option value="cyr">Кирилл</option><option value="lat">Лотин</option>
        </select>
      </label>
    </div>
  );
}

function ModalFooter({ save, setSave, pending, error, onClose }: {
  save: boolean; setSave: (v: boolean) => void; pending: boolean; error: Error | null; onClose: () => void;
}) {
  return (
    <div className="mt-2 space-y-3 border-t pt-4">
      {error && <p className="text-sm text-red-600">{error.message}</p>}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" className="h-4 w-4 rounded border-slate-300 accent-blue-700" checked={save} onChange={(e) => setSave(e.target.checked)} />
          Ҳужжатни сақлаш ҳамда юклаб олинган ҳужжатлар рўйхатига қўшиш
        </label>
        <div className="flex gap-2">
          <button type="button" className="btn-secondary" onClick={onClose}>Бекор қилиш</button>
          <button className="btn-primary" disabled={pending}><Plus size={16} /> Докх шаклида олиш</button>
        </div>
      </div>
    </div>
  );
}

/** Ариза, келишув, ўтказиш буйруғи, маълумотнома */
export function DocModal({ type, employee, onClose }: { type: Exclude<DocType, 'buyruq-tatil'>; employee: any; onClose: () => void }) {
  const [f, setF] = useState<any>({
    newDepartmentId: '', newPositionId: '', transferDate: '', applicationDate: today(), agreementDate: today(),
    newSalary: '', poaText: '', orderNumber: '', orderDate: today(), basis: '', malumoti: '', harbiyUnvoni: '',
  });
  const [save, setSave] = useState(true);
  const [lang, setLang] = useState<Lang>('cyr');
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
    if (type === 'obyektivka') copy('malumoti', 'harbiyUnvoni');
    return params;
  });

  const cur = `${employee.department.name}, ${employee.position.title}`;
  return (
    <Modal title={TYPE_LABEL[type]} onClose={onClose} wide>
      <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); submit.mutate(); }}>
        <LangPicker lang={lang} setLang={setLang} />
        <section><Field label="Ходим"><input className="input bg-slate-50" readOnly value={`${employee.lastName} ${employee.firstName} — ${cur}`} /></Field></section>

        {needsTarget && (
          <section>
            <SectionTitle>Янги иш жойи</SectionTitle>
            <div className="grid gap-4 md:grid-cols-3">
              <Field label="Янги филиал / ҳудуд *"><select required className="input" value={f.newDepartmentId} onChange={(e) => setF({ ...f, newDepartmentId: e.target.value, newPositionId: '' })}><option value="">Танланг</option>{departments.data?.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></Field>
              <Field label="Янги лавозим *"><select required className="input" disabled={!f.newDepartmentId} value={f.newPositionId}
                onChange={(e) => { const p = positions.data?.find((x) => x.id === e.target.value); setF({ ...f, newPositionId: e.target.value, newSalary: type === 'kelishuv' && p ? Number(p.baseSalary) : f.newSalary }); }}>
                <option value="">Танланг</option>{positions.data?.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}</select></Field>
              <Field label="Ўтказиш санаси *"><input required type="date" className="input" value={f.transferDate} onChange={set('transferDate')} /></Field>
            </div>
          </section>
        )}

        {type === 'ariza' && (
          <section className="grid gap-4 md:grid-cols-3">
            <Field label="Ариза санаси *"><input required type="date" className="input" value={f.applicationDate} onChange={set('applicationDate')} /></Field>
          </section>
        )}

        {type === 'kelishuv' && (
          <section>
            <SectionTitle>Келишув</SectionTitle>
            <div className="grid gap-4 md:grid-cols-3">
              <Field label="Шартнома"><input className="input bg-slate-50" readOnly value={employee.contractNumber ? `${employee.contractNumber} (${fmtDate(employee.contractDate)})` : 'Киритилмаган!'} /></Field>
              <Field label="Келишув тузилган сана *"><input required type="date" className="input" value={f.agreementDate} onChange={set('agreementDate')} /></Field>
              <Field label="Янги ойлик иш ҳақи (сўм) *"><input required type="number" min={0} className="input" value={f.newSalary} onChange={set('newSalary')} /></Field>
              <div className="md:col-span-3"><Field label="Ишончнома реквизитлари"><input className="input" placeholder={settings.data?.ishonchnoma_matni} value={f.poaText} onChange={set('poaText')} /></Field></div>
            </div>
            <p className="mt-2 text-xs text-slate-500">Келишув рақами автоматик берилади (ходим бўйича 1, 2, …).</p>
          </section>
        )}

        {type === 'buyruq-otkazish' && (
          <section>
            <SectionTitle>Буйруқ</SectionTitle>
            <div className="grid gap-4 md:grid-cols-3">
              <Field label="Буйруқ рақами"><input className="input" placeholder="Бўш қолса автоматик" value={f.orderNumber} onChange={set('orderNumber')} /></Field>
              <Field label="Буйруқ санаси *"><input required type="date" className="input" value={f.orderDate} onChange={set('orderDate')} /></Field>
              <div className="md:col-span-3"><Field label="Асос *"><textarea required rows={3} className="input" placeholder="Ходимнинг аризаси, қўшимча келишув ҳамда ЎзР Меҳнат кодексининг 138, 140-моддалари" value={f.basis} onChange={set('basis')} /></Field></div>
            </div>
          </section>
        )}

        {type === 'obyektivka' && (
          <section className="grid gap-4 md:grid-cols-2">
            <Field label="Маълумоти"><input className="input" placeholder="Олий" value={f.malumoti} onChange={set('malumoti')} /></Field>
            <Field label="Ҳарбий унвони"><input className="input" placeholder="йўқ" value={f.harbiyUnvoni} onChange={set('harbiyUnvoni')} /></Field>
          </section>
        )}

        <ModalFooter save={save} setSave={setSave} pending={submit.isPending} error={submit.error as Error | null} onClose={onClose} />
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
export function LeaveModal({ employee, onClose }: { employee: any; onClose: () => void }) {
  const [f, setF] = useState({
    workYearStart: '', workYearEnd: '', startDate: '', basicDays: String(employee.annualLeaveBasicDays), extraDays: String(employee.annualLeaveExtraDays),
    basis: '', signer: '', orderDate: today(),
  });
  const [save, setSave] = useState(true);
  const [lang, setLang] = useState<Lang>('cyr');
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
  const D = DEFAULTS[lang];

  const submit = useGenerate('buyruq-tatil', employee, onClose, save, lang, () => ({
    startDate: f.startDate, orderDate: f.orderDate, basicDays: Number(f.basicDays) || 0, extraDays: Number(f.extraDays) || 0,
    ...(wyStart && { workYearStart: wyStart }), ...(wyEnd && { workYearEnd: wyEnd }),
    basis: f.basis || D.basis, signer: f.signer || D.signer,
  }));

  const s = settings.data;
  const fullName = [employee.lastName, employee.firstName, employee.middleName].filter(Boolean).join(' ');
  const unit = [employee.department.parent?.name, employee.department.name].filter(Boolean).join(', ');
  const ro = 'input bg-slate-50 text-slate-700';

  return (
    <Modal title="Меҳнат таътили бериш ҳақида буйруқ" onClose={onClose} wide>
      <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); submit.mutate(); }}>
        <LangPicker lang={lang} setLang={setLang} />
        <section className="grid gap-4 md:grid-cols-2">
          <Field label="Кимга"><textarea rows={2} className={ro} readOnly value={s ? `«${s.tashkilot_nomi}» бош директори ${s.bosh_direktor_fish}га` : ''} /></Field>
          <Field label="Кимдан"><textarea rows={2} className={ro} readOnly value={`${fullName} — ${unit}, ${employee.position.title}`} /></Field>
        </section>

        <section>
          <SectionTitle>Саналар ва муддатлар</SectionTitle>
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Иш йили бошланиши"><input type="date" className="input" value={wyStart} onChange={set('workYearStart')} /></Field>
            <Field label="Иш йили тугаши"><input type="date" className="input" value={wyEnd} onChange={set('workYearEnd')} /></Field>
            <Field label="Бошланиши *"><input required type="date" className="input" value={f.startDate} onChange={set('startDate')} /></Field>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <Field label="Асосий таътил куни"><input type="number" min={0} className="input" value={f.basicDays} onChange={set('basicDays')} /></Field>
          <Field label="Қўшимча таътил куни"><input type="number" min={0} className="input" value={f.extraDays} onChange={set('extraDays')} /></Field>
          <Field label="Жами календар кун"><input className={ro} readOnly value={days} /></Field>
        </section>

        <section className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Тугаши"><div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold">{calc.data ? fmtDate(calc.data.endDate) : '—'}</div></Field>
            <Field label="Ишга чиқиш куни"><div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold">{calc.data ? fmtDate(calc.data.returnDate) : '—'}</div></Field>
          </div>
          {calc.data?.holidaysInRange.length > 0 && (
            <p className="mt-2 text-xs font-medium text-red-600">Байрам кунлари сабабли узайтирилди: {calc.data.holidaysInRange.map((d: string) => fmtDate(d)).join(', ')}</p>
          )}
          {!f.startDate && <p className="mt-2 text-xs text-slate-500">Бошланиш санасини танланг — тугаш ва ишга чиқиш санаси автоматик ҳисобланади.</p>}
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2"><Field label="Асос"><textarea rows={2} className="input" placeholder="Меҳнат кодексининг 217, 219... моддалари ҳамда ходим аризаси" value={f.basis || D.basis} onChange={set('basis')} /></Field></div>
          <Field label="Имзоловчи"><textarea rows={2} className="input" value={f.signer || D.signer} onChange={set('signer')} /></Field>
          <Field label="Буйруқ санаси"><input required type="date" className="input" value={f.orderDate} onChange={set('orderDate')} /></Field>
        </section>

        <ModalFooter save={save} setSave={setSave} pending={submit.isPending} error={submit.error as Error | null} onClose={onClose} />
      </form>
    </Modal>
  );
}
