import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, FileText, Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import EmployeeForm from '../components/EmployeeForm';
import GenerateDocs from '../components/GenerateDocs';
import { ErrorNote, Field, Loading, StatusBadge } from '../components/ui';
import { api, photoSrc, CONTRACT_LABEL, EMP_TYPE_LABEL, fmtDate, fmtMoney, fullName, GENDER_LABEL } from '../lib/api';
import { Avatar, Button, DatePicker, FileDropzone, Input, Select, Tabs } from '../components/kit';
import { useCan } from '../auth/AuthContext';

const TABS = ['Шахсий маълумотлар', 'Меҳнат фаолияти', 'Қариндошлари', 'Ҳужжатлар', 'Ҳужжат яратиш'] as const;
const DOC_TYPES = [
  ['pasport', 'Паспорт'], ['diplom', 'Диплом'], ['mehnat_daftarchasi', 'Меҳнат дафтарчаси'],
  ['sudlanmaganlik', 'Судланмаганлик ҳақида маълумотнома'], ['boshqa', 'Бошқа'],
];

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return <div className="flex justify-between gap-6 border-b border-slate-100 py-2.5 text-[13.5px] last:border-0"><dt className="shrink-0 whitespace-nowrap text-slate-500">{k}</dt><dd className="min-w-0 text-right font-medium text-slate-900">{v || '—'}</dd></div>;
}

export default function EmployeeProfile() {
  const can = useCan();
  const { id } = useParams();
  const qc = useQueryClient();
  const [tab, setTab] = useState<(typeof TABS)[number]>(TABS[0]);
  const [editing, setEditing] = useState(false);
  const { data: e, isLoading, error } = useQuery({ queryKey: ['employee', id], queryFn: () => api(`/employees/${id}`) });
  const refresh = () => qc.invalidateQueries({ queryKey: ['employee', id] });

  if (isLoading) return <Loading />;
  if (error) return <ErrorNote error={error} />;

  return (
    <div>
      <nav className="mb-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-slate-500" aria-label="Йўл">
        <Link to="/employees" className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap hover:text-navy"><ArrowLeft size={14} /> Ходимлар</Link>
        <span aria-hidden>/</span><span className="min-w-0 break-words text-slate-800">{fullName(e)}</span>
      </nav>
      <header className="mb-6 flex flex-wrap items-center gap-x-5 gap-y-4">
        <Avatar size={72} src={photoSrc(e.photoUrl)} name={fullName(e)} />
        <div className="min-w-[200px] flex-1">
          <p className="mb-1 text-xs font-medium text-slate-500">Табель № <span className="tnum">{e.tabNumber}</span></p>
          <h1 className="text-2xl font-bold leading-8 tracking-[-0.025em] text-slate-950">{fullName(e)}</h1>
          <p className="mt-1 text-[13.5px] text-slate-500">{e.position.title} · {e.department.name}</p>
        </div>
        <div className="flex items-center gap-5"><StatusBadge status={e.status} />{can.write && <Button variant="secondary" onClick={() => setEditing(true)}><Pencil size={15} /> Таҳрирлаш</Button>}</div>
      </header>

      <Tabs aria-label="Ходим маълумотлари" items={TABS.map((t) => ({ value: t, label: t }))} value={tab} onChange={setTab} />
      <div className="card mt-5 min-h-[220px] p-6">
      {tab === TABS[0] && (
        <dl className="grid grid-cols-1 gap-x-14 gap-y-8 md:grid-cols-2">
          <div>
            <h3 className="eyebrow mb-2">Шахсий</h3>
            <Row k="Туғилган санаси" v={fmtDate(e.birthDate)} /><Row k="Туғилган жойи" v={e.birthPlace} />
            <Row k="Жинси" v={GENDER_LABEL[e.gender]} /><Row k="Миллати" v={e.nationality} /><Row k="Партиявийлиги" v={e.partyMembership} />
            <Row k="Телефон" v={e.phone} /><Row k="Манзил" v={e.addressResidential} />
            <Row k="ЖШШИР" v={e.pinfl} /><Row k="Паспорт" v={e.passportSeriesNumber} />
            <Row k="Берилган санаси" v={fmtDate(e.passportGivenDate)} /><Row k="Ким томонидан" v={e.passportGivenBy} />
            <h3 className="eyebrow mb-2 mt-6">Қўшимча (Т-2)</h3>
            <Row k="Маълумоти" v={e.educationLevel} /><Row k="Чет тиллари" v={e.foreignLanguages} />
            <Row k="Илмий даражаси" v={e.academicDegree} /><Row k="Илмий унвони" v={e.academicTitle} />
            <Row k="Ҳарбий унвони" v={e.militaryRank} /><Row k="Давлат мукофотлари" v={e.stateAwards} />
            <Row k="Депутатлик" v={e.deputyStatus} />
          </div>
          <div>
            <h3 className="eyebrow mb-2">Иш</h3>
            <Row k="Иш тури" v={EMP_TYPE_LABEL[e.employmentType]} />
            <Row k="Ишга қабул санаси" v={fmtDate(e.hireDate)} />
            <Row k="Шартнома" v={e.contractNumber && `${e.contractNumber} (${fmtDate(e.contractDate)})`} />
            <Row k="Шартнома муддати" v={CONTRACT_LABEL[e.contractDurationType]} /><Row k="Синов муддати" v={`${e.probationMonths} ой`} />
            <Row k="Ойлик маош" v={fmtMoney(e.salary)} />
            <Row k="Меҳнат таътили" v={`${e.annualLeaveBasicDays} + ${e.annualLeaveExtraDays} кун`} />
          </div>
        </dl>
      )}
      {tab === TABS[1] && <WorkHistory e={e} onSaved={refresh} />}
      {tab === TABS[2] && <Relatives e={e} onSaved={refresh} />}
      {tab === TABS[3] && <Documents e={e} onSaved={refresh} />}
      {tab === TABS[4] && <GenerateDocs employee={e} />}
      </div>
      {editing && <EmployeeForm employee={e} onClose={() => setEditing(false)} />}
    </div>
  );
}

/** Ro'yxat qatorlarini qo'shish/o'chirish: PATCH butun ro'yxatni almashtiradi. */
function useListSave(e: any, key: 'workHistory' | 'relatives', onSaved: () => void) {
  return useMutation({
    mutationFn: (list: any[]) => api(`/employees/${e.id}`, { method: 'PATCH', body: JSON.stringify({ [key]: list }) }),
    onSuccess: onSaved,
  });
}
const strip = ({ id, employeeId, ...rest }: any) => rest;

function WorkHistory({ e, onSaved }: { e: any; onSaved: () => void }) {
  const can = useCan();
  const save = useListSave(e, 'workHistory', onSaved);
  const [n, setN] = useState({ startDate: '', endDate: '', organizationName: '', positionTitle: '' });
  const clean = (w: any) => Object.fromEntries(Object.entries(strip(w)).filter(([, v]) => v));
  return (
    <div>
      <table className="mb-4 w-full text-sm">
        <thead><tr><th className="th">Давр</th><th className="th">Ташкилот</th><th className="th">Лавозим</th><th /></tr></thead>
        <tbody className="divide-y divide-slate-100">
          {e.workHistory.map((w: any) => (
            <tr key={w.id}><td className="td whitespace-nowrap">{fmtDate(w.startDate)} — {w.endDate ? fmtDate(w.endDate) : 'ҳозиргача'}</td><td className="td">{w.organizationName}</td><td className="td">{w.positionTitle}</td>
              <td className="td text-right">{can.write && <button aria-label="Ўчириш" className="text-slate-400 hover:text-red-600" onClick={() => save.mutate(e.workHistory.filter((x: any) => x.id !== w.id).map(clean))}><Trash2 size={16} /></button>}</td></tr>
          ))}
          {e.workHistory.length === 0 && <tr><td colSpan={4} className="td text-slate-500">Маълумот йўқ</td></tr>}
        </tbody>
      </table>
      {can.write && <form className="grid grid-cols-1 items-end gap-3 sm:grid-cols-5" onSubmit={(ev) => { ev.preventDefault(); save.mutate([...e.workHistory.map(clean), clean(n)]); setN({ startDate: '', endDate: '', organizationName: '', positionTitle: '' }); }}>
        <Field label="Бошланиши"><DatePicker value={n.startDate} onChange={(v) => setN({ ...n, startDate: v })} /></Field>
        <Field label="Тугаши"><DatePicker value={n.endDate} onChange={(v) => setN({ ...n, endDate: v })} /></Field>
        <Field label="Ташкилот *"><Input required value={n.organizationName} onChange={(x) => setN({ ...n, organizationName: x.target.value })} /></Field>
        <Field label="Лавозим"><Input value={n.positionTitle} onChange={(x) => setN({ ...n, positionTitle: x.target.value })} /></Field>
        <Button variant="primary" className="justify-center"  disabled={save.isPending}>Қўшиш</Button>
      </form>}
    </div>
  );
}

function Relatives({ e, onSaved }: { e: any; onSaved: () => void }) {
  const can = useCan();
  const save = useListSave(e, 'relatives', onSaved);
  const empty = { relativeType: '', fullName: '', birthYearPlace: '', workPlacePosition: '', livingAddress: '' };
  const [n, setN] = useState(empty);
  const clean = (r: any) => Object.fromEntries(Object.entries(strip(r)).filter(([, v]) => v));
  return (
    <div>
      <div className="mb-4 overflow-x-auto"><table className="w-full text-sm">
        <thead><tr><th className="th">Қариндошлиги</th><th className="th">Ф.И.Ш.</th><th className="th">Туғилган йил, жой</th><th className="th">Иш жойи</th><th className="th">Манзил</th><th /></tr></thead>
        <tbody className="divide-y divide-slate-100">
          {e.relatives.map((r: any) => (
            <tr key={r.id}><td className="td">{r.relativeType}</td><td className="td">{r.fullName}</td><td className="td">{r.birthYearPlace}</td><td className="td">{r.workPlacePosition}</td><td className="td">{r.livingAddress}</td>
              <td className="td text-right">{can.write && <button aria-label="Ўчириш" className="text-slate-400 hover:text-red-600" onClick={() => save.mutate(e.relatives.filter((x: any) => x.id !== r.id).map(clean))}><Trash2 size={16} /></button>}</td></tr>
          ))}
          {e.relatives.length === 0 && <tr><td colSpan={6} className="td text-slate-500">Маълумот йўқ</td></tr>}
        </tbody>
      </table></div>
      {can.write && <form className="grid grid-cols-1 items-end gap-3 sm:grid-cols-6" onSubmit={(ev) => { ev.preventDefault(); save.mutate([...e.relatives.map(clean), clean(n)]); setN(empty); }}>
        {([['relativeType', 'Қариндошлиги *', true], ['fullName', 'Ф.И.Ш. *', true], ['birthYearPlace', 'Туғилган йил, жой'], ['workPlacePosition', 'Иш жойи'], ['livingAddress', 'Манзил']] as const).map(([k, label, req]) => (
          <Field key={k} label={label}><Input required={!!req} value={(n as any)[k]} onChange={(x) => setN({ ...n, [k]: x.target.value })} /></Field>
        ))}
        <Button variant="primary" className="justify-center"  disabled={save.isPending}>Қўшиш</Button>
      </form>}
    </div>
  );
}

function Documents({ e, onSaved }: { e: any; onSaved: () => void }) {
  const can = useCan();
  const [type, setType] = useState('pasport');
  const up = useMutation({
    mutationFn: (file: File) => { const f = new FormData(); f.append('documentType', type); f.append('file', file); return api(`/employees/${e.id}/documents`, { method: 'POST', body: f }); },
    onSuccess: onSaved,
  });
  const del = useMutation({ mutationFn: (id: string) => api(`/documents/${id}`, { method: 'DELETE' }), onSuccess: onSaved });
  const label = (t: string) => DOC_TYPES.find(([k]) => k === t)?.[1] ?? t;
  return (
    <div>
      {can.write && <><div className="mb-4 flex flex-wrap items-center gap-3">
        <Select className="!w-auto" value={type} onChange={(v) => setType(v)}>{DOC_TYPES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select>
        <span className="text-xs text-slate-500">Ҳужжат турини танлаб, файлни пастдаги майдонга ташланг</span>
      </div>
      <FileDropzone accept={{ 'application/pdf': ['.pdf'], 'image/jpeg': ['.jpg', '.jpeg'], 'image/png': ['.png'] }} typesHint="PDF, JPG, PNG" maxMb={10} loading={up.isPending} onFile={(f) => up.mutate(f)} className="mb-3" />
      {up.error && <p className="mb-3 text-sm text-red-600" role="alert">{(up.error as Error).message}</p>}</>}
      <ul className="divide-y">
        {e.documents.map((d: any) => (
          <li key={d.id} className="flex items-center gap-3 py-3 text-sm">
            <FileText size={18} className="text-navy/60" />
            <a href={`/api/files/${d.filePath}`} target="_blank" rel="noreferrer" className="font-medium text-slate-950 hover:underline">{label(d.documentType)}</a>
            <span className="text-slate-500">{fmtDate(d.uploadDate)}</span>
            {can.write && <button aria-label="Ўчириш" className="ml-auto text-slate-400 hover:text-red-600" onClick={() => confirm('Ҳужжат ўчирилсинми?') && del.mutate(d.id)}><Trash2 size={16} /></button>}
          </li>
        ))}
        {e.documents.length === 0 && <li className="py-3 text-sm text-slate-500">Ҳужжатлар юкланмаган</li>}
      </ul>
    </div>
  );
}
