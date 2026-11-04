import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, FileText, Pencil, Trash2, Upload, UserRound } from 'lucide-react';
import { useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import EmployeeForm from '../components/EmployeeForm';
import GenerateDocs from '../components/GenerateDocs';
import { Field, StatusBadge } from '../components/ui';
import { api, fmtDate, fmtMoney, fullName } from '../lib/api';

const TABS = ['Shaxsiy ma\'lumotlar', 'Mehnat faoliyati', 'Qarindoshlar', 'Hujjatlar', 'Hujjat yaratish'] as const;
const DOC_TYPES = [
  ['pasport', 'Pasport'], ['diplom', 'Diplom'], ['mehnat_daftarchasi', 'Mehnat daftarchasi'],
  ['sudlanmaganlik', 'Sudlanmaganlik haqida ma\'lumotnoma'], ['boshqa', 'Boshqa'],
];

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return <div className="flex justify-between gap-4 border-b py-2 text-sm last:border-0"><span className="text-slate-500">{k}</span><span className="text-right font-medium">{v || '—'}</span></div>;
}

export default function EmployeeProfile() {
  const { id } = useParams();
  const qc = useQueryClient();
  const [tab, setTab] = useState<(typeof TABS)[number]>(TABS[0]);
  const [editing, setEditing] = useState(false);
  const { data: e, isLoading, error } = useQuery({ queryKey: ['employee', id], queryFn: () => api(`/employees/${id}`) });
  const refresh = () => qc.invalidateQueries({ queryKey: ['employee', id] });

  if (isLoading) return <p className="text-slate-500">Yuklanmoqda…</p>;
  if (error) return <p className="text-brand">{(error as Error).message}</p>;

  return (
    <div className="space-y-5">
      <Link to="/employees" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-navy"><ArrowLeft size={16} /> Xodimlar</Link>
      <div className="card flex flex-wrap items-center gap-5 p-5">
        <PhotoBox e={e} onDone={refresh} />
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-semibold text-navy">{fullName(e)}</h1>
          <p className="text-sm text-slate-500">{e.position.title} · {e.department.name}</p>
          <div className="mt-2 flex items-center gap-3 text-sm"><StatusBadge status={e.status} /><span className="font-mono text-slate-500">Tabel: {e.tabNumber}</span></div>
        </div>
        <button className="btn-secondary" onClick={() => setEditing(true)}><Pencil size={16} /> Tahrirlash</button>
      </div>

      <div className="flex gap-1 overflow-x-auto border-b">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`whitespace-nowrap border-b-2 px-4 py-2.5 text-sm ${tab === t ? 'border-brand font-medium text-navy' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>{t}</button>
        ))}
      </div>

      {tab === TABS[0] && (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="card p-5">
            <h3 className="mb-2 font-semibold">Shaxsiy</h3>
            <Row k="Tug'ilgan sana" v={fmtDate(e.birthDate)} /><Row k="Tug'ilgan joy" v={e.birthPlace} />
            <Row k="Jinsi" v={e.gender} /><Row k="Millati" v={e.nationality} /><Row k="Partiyaviyligi" v={e.partyMembership} />
            <Row k="Telefon" v={e.phone} /><Row k="Manzil" v={e.addressResidential} />
            <Row k="JSHSHIR" v={e.pinfl} /><Row k="Pasport" v={e.passportSeriesNumber} />
            <Row k="Berilgan sana" v={fmtDate(e.passportGivenDate)} /><Row k="Kim tomonidan" v={e.passportGivenBy} />
          </div>
          <div className="card p-5">
            <h3 className="mb-2 font-semibold">Ish</h3>
            <Row k="Ish turi" v={e.employmentType === 'gpx' ? 'GPX (shartnoma)' : 'Shtat'} />
            <Row k="Ishga qabul sanasi" v={fmtDate(e.hireDate)} />
            <Row k="Shartnoma" v={e.contractNumber && `${e.contractNumber} (${fmtDate(e.contractDate)})`} />
            <Row k="Shartnoma muddati" v={e.contractDurationType} /><Row k="Sinov muddati" v={`${e.probationMonths} oy`} />
            <Row k="Oylik maosh" v={fmtMoney(e.salary)} />
            <Row k="Mehnat ta'tili" v={`${e.annualLeaveBasicDays} + ${e.annualLeaveExtraDays} kun`} />
          </div>
        </div>
      )}
      {tab === TABS[1] && <WorkHistory e={e} onSaved={refresh} />}
      {tab === TABS[2] && <Relatives e={e} onSaved={refresh} />}
      {tab === TABS[3] && <Documents e={e} onSaved={refresh} />}
      {tab === TABS[4] && <GenerateDocs employee={e} />}
      {editing && <EmployeeForm employee={e} onClose={() => setEditing(false)} />}
    </div>
  );
}

function PhotoBox({ e, onDone }: { e: any; onDone: () => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const up = useMutation({
    mutationFn: (file: File) => { const f = new FormData(); f.append('file', file); return api(`/employees/${e.id}/photo`, { method: 'POST', body: f }); },
    onSuccess: onDone,
  });
  return (
    <button onClick={() => ref.current?.click()} title="Rasm yuklash" className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full bg-navy/5 text-navy/40">
      {e.photoUrl ? <img src={`/api/files/${e.photoUrl}`} className="h-full w-full object-cover" alt="" /> : <UserRound className="mx-auto" size={48} />}
      <input ref={ref} type="file" accept=".jpg,.jpeg,.png" hidden onChange={(ev) => ev.target.files?.[0] && up.mutate(ev.target.files[0])} />
    </button>
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
  const save = useListSave(e, 'workHistory', onSaved);
  const [n, setN] = useState({ startDate: '', endDate: '', organizationName: '', positionTitle: '' });
  const clean = (w: any) => Object.fromEntries(Object.entries(strip(w)).filter(([, v]) => v));
  return (
    <div className="card p-5">
      <table className="mb-4 w-full text-sm">
        <thead><tr><th className="th">Davr</th><th className="th">Tashkilot</th><th className="th">Lavozim</th><th /></tr></thead>
        <tbody className="divide-y">
          {e.workHistory.map((w: any) => (
            <tr key={w.id}><td className="td">{fmtDate(w.startDate)} — {w.endDate ? fmtDate(w.endDate) : 'hozirgacha'}</td><td className="td">{w.organizationName}</td><td className="td">{w.positionTitle}</td>
              <td className="td text-right"><button aria-label="O'chirish" className="text-slate-400 hover:text-brand" onClick={() => save.mutate(e.workHistory.filter((x: any) => x.id !== w.id).map(clean))}><Trash2 size={16} /></button></td></tr>
          ))}
          {e.workHistory.length === 0 && <tr><td colSpan={4} className="td text-slate-500">Ma'lumot yo'q</td></tr>}
        </tbody>
      </table>
      <form className="grid items-end gap-3 sm:grid-cols-5" onSubmit={(ev) => { ev.preventDefault(); save.mutate([...e.workHistory.map(clean), clean(n)]); setN({ startDate: '', endDate: '', organizationName: '', positionTitle: '' }); }}>
        <Field label="Boshlanish"><input type="date" className="input" value={n.startDate} onChange={(x) => setN({ ...n, startDate: x.target.value })} /></Field>
        <Field label="Tugash"><input type="date" className="input" value={n.endDate} onChange={(x) => setN({ ...n, endDate: x.target.value })} /></Field>
        <Field label="Tashkilot *"><input required className="input" value={n.organizationName} onChange={(x) => setN({ ...n, organizationName: x.target.value })} /></Field>
        <Field label="Lavozim"><input className="input" value={n.positionTitle} onChange={(x) => setN({ ...n, positionTitle: x.target.value })} /></Field>
        <button className="btn-primary justify-center" disabled={save.isPending}>Qo'shish</button>
      </form>
    </div>
  );
}

function Relatives({ e, onSaved }: { e: any; onSaved: () => void }) {
  const save = useListSave(e, 'relatives', onSaved);
  const empty = { relativeType: '', fullName: '', birthYearPlace: '', workPlacePosition: '', livingAddress: '' };
  const [n, setN] = useState(empty);
  const clean = (r: any) => Object.fromEntries(Object.entries(strip(r)).filter(([, v]) => v));
  return (
    <div className="card p-5">
      <div className="mb-4 overflow-x-auto"><table className="w-full text-sm">
        <thead><tr><th className="th">Qarindoshligi</th><th className="th">F.I.Sh.</th><th className="th">Tug'ilgan yil, joy</th><th className="th">Ish joyi</th><th className="th">Manzil</th><th /></tr></thead>
        <tbody className="divide-y">
          {e.relatives.map((r: any) => (
            <tr key={r.id}><td className="td">{r.relativeType}</td><td className="td">{r.fullName}</td><td className="td">{r.birthYearPlace}</td><td className="td">{r.workPlacePosition}</td><td className="td">{r.livingAddress}</td>
              <td className="td text-right"><button aria-label="O'chirish" className="text-slate-400 hover:text-brand" onClick={() => save.mutate(e.relatives.filter((x: any) => x.id !== r.id).map(clean))}><Trash2 size={16} /></button></td></tr>
          ))}
          {e.relatives.length === 0 && <tr><td colSpan={6} className="td text-slate-500">Ma'lumot yo'q</td></tr>}
        </tbody>
      </table></div>
      <form className="grid items-end gap-3 sm:grid-cols-6" onSubmit={(ev) => { ev.preventDefault(); save.mutate([...e.relatives.map(clean), clean(n)]); setN(empty); }}>
        {([['relativeType', 'Qarindoshligi *', true], ['fullName', 'F.I.Sh. *', true], ['birthYearPlace', "Tug'ilgan yil, joy"], ['workPlacePosition', 'Ish joyi'], ['livingAddress', 'Manzil']] as const).map(([k, label, req]) => (
          <Field key={k} label={label}><input required={!!req} className="input" value={(n as any)[k]} onChange={(x) => setN({ ...n, [k]: x.target.value })} /></Field>
        ))}
        <button className="btn-primary justify-center" disabled={save.isPending}>Qo'shish</button>
      </form>
    </div>
  );
}

function Documents({ e, onSaved }: { e: any; onSaved: () => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const [type, setType] = useState('pasport');
  const up = useMutation({
    mutationFn: (file: File) => { const f = new FormData(); f.append('documentType', type); f.append('file', file); return api(`/employees/${e.id}/documents`, { method: 'POST', body: f }); },
    onSuccess: onSaved,
  });
  const del = useMutation({ mutationFn: (id: string) => api(`/documents/${id}`, { method: 'DELETE' }), onSuccess: onSaved });
  const label = (t: string) => DOC_TYPES.find(([k]) => k === t)?.[1] ?? t;
  return (
    <div className="card p-5">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <select className="input w-auto" value={type} onChange={(x) => setType(x.target.value)}>{DOC_TYPES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
        <input ref={ref} type="file" accept=".pdf,.jpg,.jpeg,.png" hidden onChange={(x) => { if (x.target.files?.[0]) up.mutate(x.target.files[0]); x.target.value = ''; }} />
        <button className="btn-primary" onClick={() => ref.current?.click()} disabled={up.isPending}><Upload size={16} /> Fayl yuklash</button>
        <span className="text-xs text-slate-500">PDF, JPG, PNG · 10 MB gacha</span>
      </div>
      {up.error && <p className="mb-3 text-sm text-brand">{(up.error as Error).message}</p>}
      <ul className="divide-y">
        {e.documents.map((d: any) => (
          <li key={d.id} className="flex items-center gap-3 py-3 text-sm">
            <FileText size={18} className="text-navy/60" />
            <a href={`/api/files/${d.filePath}`} target="_blank" rel="noreferrer" className="font-medium text-navy hover:text-brand">{label(d.documentType)}</a>
            <span className="text-slate-500">{fmtDate(d.uploadDate)}</span>
            <button aria-label="O'chirish" className="ml-auto text-slate-400 hover:text-brand" onClick={() => confirm("Hujjat o'chirilsinmi?") && del.mutate(d.id)}><Trash2 size={16} /></button>
          </li>
        ))}
        {e.documents.length === 0 && <li className="py-3 text-sm text-slate-500">Hujjatlar yuklanmagan</li>}
      </ul>
    </div>
  );
}
