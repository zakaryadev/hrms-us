import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, FilePlus2 } from 'lucide-react';
import { useState } from 'react';
import { api, fmtDate } from '../lib/api';
import { Field, Modal } from './ui';

type DocType = 'obyektivka' | 'ariza' | 'kelishuv' | 'buyruq-otkazish' | 'buyruq-tatil';
const DOCS: { type: DocType; title: string; desc: string }[] = [
  { type: 'obyektivka', title: "Ma'lumotnoma (T-2)", desc: "Obyektivka: shaxsiy ma'lumot, mehnat faoliyati, qarindoshlar" },
  { type: 'ariza', title: "Boshqa ishga o'tish arizasi", desc: "Xodim nomidan ariza" },
  { type: 'kelishuv', title: "Qo'shimcha kelishuv", desc: "Mehnat shartnomasiga (raqam avtomatik)" },
  { type: 'buyruq-otkazish', title: "Lavozimga o'tkazish buyrug'i", desc: "Boshqa ishga doimiy o'tkazish" },
  { type: 'buyruq-tatil', title: "Mehnat ta'tili buyrug'i", desc: "Bayram kunlari hisobi bilan" },
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
          <button key={d.type} onClick={() => setOpen(d.type)} className="card flex items-start gap-3 p-4 text-left transition hover:border-navy">
            <FilePlus2 className="mt-0.5 shrink-0 text-brand" size={20} />
            <span><span className="block text-sm font-semibold">{d.title}</span><span className="text-xs text-slate-500">{d.desc}</span></span>
          </button>
        ))}
      </div>
      <div className="card p-5">
        <h3 className="mb-2 font-semibold">Yaratilgan hujjatlar</h3>
        <ul className="divide-y">
          {history.data?.map((g) => (
            <li key={g.id} className="flex items-center gap-3 py-2.5 text-sm">
              <span className="font-medium">{TYPE_LABEL[g.type] ?? g.type}</span>
              {g.number && <span className="text-slate-500">№ {g.number}</span>}
              <span className="text-slate-500">{fmtDate(g.createdAt)}</span>
              <a className="btn-secondary ml-auto !px-3 !py-1.5" href={`/api/documents/generated/${g.id}/download`}><Download size={14} /> DOCX</a>
            </li>
          ))}
          {history.data?.length === 0 && <li className="py-2 text-sm text-slate-500">Hali hujjat yaratilmagan</li>}
        </ul>
      </div>
      {open && <DocModal type={open} employee={employee} onClose={() => setOpen(null)} />}
    </div>
  );
}

function DocModal({ type, employee, onClose }: { type: DocType; employee: any; onClose: () => void }) {
  const qc = useQueryClient();
  const [f, setF] = useState<any>({
    newDepartmentId: '', newPositionId: '', transferDate: '', applicationDate: today(), agreementDate: today(),
    newSalary: '', poaText: '', orderNumber: '', orderDate: today(), basis: '',
    startDate: '', basicDays: employee.annualLeaveBasicDays, extraDays: employee.annualLeaveExtraDays, materialAid: false,
    malumoti: '', harbiyUnvoni: '',
  });
  const set = (k: string) => (e: React.ChangeEvent<any>) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  const needsTarget = ['ariza', 'kelishuv', 'buyruq-otkazish'].includes(type);

  const departments = useQuery({ queryKey: ['departments'], queryFn: () => api<any[]>('/departments') });
  const positions = useQuery({ queryKey: ['positions', f.newDepartmentId], enabled: !!f.newDepartmentId, queryFn: () => api<any[]>(`/positions?departmentId=${f.newDepartmentId}`) });
  const settings = useQuery({ queryKey: ['settings'], queryFn: () => api<any>('/settings'), enabled: type === 'kelishuv' });
  const days = Number(f.basicDays) + Number(f.extraDays);
  const calc = useQuery({
    queryKey: ['leave', f.startDate, days, employee.hireDate],
    enabled: type === 'buyruq-tatil' && !!f.startDate && days > 0,
    queryFn: () => api<any>(`/leave/calc?start=${f.startDate}&days=${days}${employee.hireDate ? `&hireDate=${employee.hireDate.slice(0, 10)}` : ''}`),
    retry: false,
  });

  const submit = useMutation({
    mutationFn: () => {
      const params: any = {};
      const copy = (...keys: string[]) => keys.forEach((k) => f[k] !== '' && (params[k] = f[k]));
      if (needsTarget) copy('newDepartmentId', 'newPositionId', 'transferDate');
      if (type === 'ariza') copy('applicationDate');
      if (type === 'kelishuv') { copy('agreementDate', 'poaText'); params.newSalary = Number(f.newSalary); }
      if (type === 'buyruq-otkazish') copy('orderNumber', 'orderDate', 'basis');
      if (type === 'buyruq-tatil') { copy('startDate', 'orderDate', 'orderNumber'); params.basicDays = Number(f.basicDays); params.extraDays = Number(f.extraDays); params.materialAid = f.materialAid; }
      if (type === 'obyektivka') copy('malumoti', 'harbiyUnvoni');
      return api<{ downloadUrl: string }>(`/documents/generate/${type}`, { method: 'POST', body: JSON.stringify({ employeeId: employee.id, params }) });
    },
    onSuccess: (r) => { qc.invalidateQueries({ queryKey: ['generated', employee.id] }); window.location.href = r.downloadUrl; onClose(); },
  });

  const cur = `${employee.department.name}, ${employee.position.title}`;
  return (
    <Modal title={TYPE_LABEL[type]} onClose={onClose} wide>
      <form className="grid gap-4 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); submit.mutate(); }}>
        <div className="sm:col-span-2"><Field label="Xodim"><input className="input bg-slate-50" readOnly value={`${employee.lastName} ${employee.firstName} — ${cur}`} /></Field></div>

        {needsTarget && <>
          <Field label="Yangi filial / hudud *"><select required className="input" value={f.newDepartmentId} onChange={(e) => setF({ ...f, newDepartmentId: e.target.value, newPositionId: '' })}><option value="">Tanlang</option>{departments.data?.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></Field>
          <Field label="Yangi lavozim *"><select required className="input" disabled={!f.newDepartmentId} value={f.newPositionId}
            onChange={(e) => { const p = positions.data?.find((x) => x.id === e.target.value); setF({ ...f, newPositionId: e.target.value, newSalary: type === 'kelishuv' && p ? Number(p.baseSalary) : f.newSalary }); }}>
            <option value="">Tanlang</option>{positions.data?.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}</select></Field>
          <Field label="O'tkazish sanasi *"><input required type="date" className="input" value={f.transferDate} onChange={set('transferDate')} /></Field>
        </>}

        {type === 'ariza' && <Field label="Ariza sanasi *"><input required type="date" className="input" value={f.applicationDate} onChange={set('applicationDate')} /></Field>}

        {type === 'kelishuv' && <>
          <Field label="Shartnoma"><input className="input bg-slate-50" readOnly value={employee.contractNumber ? `${employee.contractNumber} (${fmtDate(employee.contractDate)})` : 'Kiritilmagan!'} /></Field>
          <Field label="Kelishuv tuzilgan sana *"><input required type="date" className="input" value={f.agreementDate} onChange={set('agreementDate')} /></Field>
          <Field label="Yangi oylik ish haqi (so'm) *"><input required type="number" min={0} className="input" value={f.newSalary} onChange={set('newSalary')} /></Field>
          <div className="sm:col-span-2"><Field label="Ishonchnoma rekvizitlari"><input className="input" placeholder={settings.data?.ishonchnoma_matni} value={f.poaText} onChange={set('poaText')} /></Field></div>
          <p className="text-xs text-slate-500 sm:col-span-2">Kelishuv raqami avtomatik beriladi (xodim bo'yicha 1, 2, …).</p>
        </>}

        {type === 'buyruq-otkazish' && <>
          <Field label="Buyruq raqami"><input className="input" placeholder="Bo'sh qolsa avtomatik" value={f.orderNumber} onChange={set('orderNumber')} /></Field>
          <Field label="Buyruq sanasi *"><input required type="date" className="input" value={f.orderDate} onChange={set('orderDate')} /></Field>
          <div className="sm:col-span-2"><Field label="Asos *"><textarea required rows={3} className="input" placeholder="Xodimning arizasi, qo'shimcha kelishuv hamda O'zR Mehnat kodeksining 138, 140-moddalari" value={f.basis} onChange={set('basis')} /></Field></div>
        </>}

        {type === 'buyruq-tatil' && <>
          <Field label="Ta'til boshlanish sanasi *"><input required type="date" className="input" value={f.startDate} onChange={set('startDate')} /></Field>
          <Field label="Buyruq sanasi *"><input required type="date" className="input" value={f.orderDate} onChange={set('orderDate')} /></Field>
          <Field label="Asosiy ta'til (kun)"><input type="number" min={0} className="input" value={f.basicDays} onChange={set('basicDays')} /></Field>
          <Field label="Qo'shimcha ta'til (kun)"><input type="number" min={0} className="input" value={f.extraDays} onChange={set('extraDays')} /></Field>
          <Field label="Jami kun"><input className="input bg-slate-50" readOnly value={days} /></Field>
          <Field label="Buyruq raqami"><input className="input" placeholder="Bo'sh qolsa avtomatik" value={f.orderNumber} onChange={set('orderNumber')} /></Field>
          <div className="rounded-lg bg-navy/5 p-3 text-sm sm:col-span-2">
            {calc.data ? (<>
              {calc.data.workYear && <p>Ish yili: <b>{fmtDate(calc.data.workYear.start)} — {fmtDate(calc.data.workYear.end)}</b></p>}
              <p>Ta'til tugashi: <b>{fmtDate(calc.data.endDate)}</b> · Ishga chiqish: <b>{fmtDate(calc.data.returnDate)}</b></p>
              {calc.data.holidaysInRange.length > 0 && <p className="text-brand">Bayram kunlari sababli uzaytirildi: {calc.data.holidaysInRange.map((d: string) => fmtDate(d)).join(', ')}</p>}
            </>) : <span className="text-slate-500">Boshlanish sanasini tanlang — tugash va ishga chiqish sanasi avtomatik hisoblanadi.</span>}
          </div>
          <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" checked={f.materialAid} onChange={set('materialAid')} /> Moddiy yordam (qo'shimcha oylik to'lash bandi)</label>
        </>}

        {type === 'obyektivka' && <>
          <Field label="Ma'lumoti"><input className="input" placeholder="Oliy" value={f.malumoti} onChange={set('malumoti')} /></Field>
          <Field label="Harbiy unvoni"><input className="input" placeholder="yo'q" value={f.harbiyUnvoni} onChange={set('harbiyUnvoni')} /></Field>
        </>}

        {submit.error && <p className="text-sm text-brand sm:col-span-2">{(submit.error as Error).message}</p>}
        <div className="flex justify-end gap-2 sm:col-span-2">
          <button type="button" className="btn-secondary" onClick={onClose}>Bekor qilish</button>
          <button className="btn-primary" disabled={submit.isPending}><Download size={16} /> Yaratish va yuklab olish</button>
        </div>
      </form>
    </Modal>
  );
}
