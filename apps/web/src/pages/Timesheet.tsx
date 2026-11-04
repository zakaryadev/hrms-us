import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Download, Wand2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { api, fmtMoney } from '../lib/api';

const MONTHS = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'];
const WD = ['Ya', 'Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh'];

const CODES: { code: string; label: string; cls: string; key: string }[] = [
  { code: '8', label: 'Ishlagan (8 soat)', cls: 'bg-emerald-50 text-emerald-800', key: '8' },
  { code: '7.2', label: 'Ishlagan (7.2 soat)', cls: 'bg-emerald-50 text-emerald-800', key: '7' },
  { code: 'MT', label: "Mehnat ta'tili", cls: 'bg-blue-100 text-blue-800', key: 'm' },
  { code: 'KV', label: 'Kasallik varaqasi', cls: 'bg-amber-100 text-amber-800', key: 'k' },
  { code: 'BPT', label: "Bola parvarishlash ta'tili", cls: 'bg-purple-100 text-purple-800', key: 'b' },
  { code: 'SK', label: 'Sababsiz kelmagan', cls: 'bg-red-100 text-red-700', key: 's' },
  { code: 'TSH', label: "O'z hisobidan ta'til", cls: 'bg-slate-200 text-slate-700', key: 't' },
  { code: 'TK', label: 'Tushuntirish xati olingan', cls: 'bg-orange-100 text-orange-800', key: 'x' },
];
const cls = (c?: string) => CODES.find((x) => x.code === c)?.cls ?? '';

export default function Timesheet() {
  const qc = useQueryClient();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [departmentId, setDepartmentId] = useState('');
  const [menu, setMenu] = useState<{ emp: string; day: number; x: number; y: number } | null>(null);
  const [msg, setMsg] = useState('');
  const key = ['timesheet', year, month, departmentId];

  const departments = useQuery({ queryKey: ['departments'], queryFn: () => api<any[]>('/departments') });
  const q = useQuery({ queryKey: key, queryFn: () => api<any>(`/timesheet?year=${year}&month=${month}${departmentId ? `&departmentId=${departmentId}` : ''}`) });

  const save = useMutation({
    mutationFn: ({ emp, daysData }: { emp: string; daysData: Record<string, string> }) =>
      api<any>(`/timesheet/${emp}/${year}/${month}`, { method: 'PUT', body: JSON.stringify({ daysData }) }),
    onSuccess: (r) => {
      // Server natijasini faqat u hali dolzarb bo'lsa qo'llaymiz (tez ketma-ket o'zgarishlarda eski javob yangisini bosmasin)
      qc.setQueryData(key, (old: any) => old && {
        ...old, rows: old.rows.map((row: any) => row.employeeId === r.employeeId && JSON.stringify(row.daysData) === JSON.stringify(r.daysData) ? { ...row, result: r.result } : row),
      });
    },
    onError: (e: Error) => { setMsg(e.message); qc.invalidateQueries({ queryKey: key }); },
  });

  const setCell = (emp: string, day: number, code: string | null) => {
    const row = q.data.rows.find((r: any) => r.employeeId === emp);
    const daysData = { ...row.daysData };
    if (code) daysData[String(day)] = code; else delete daysData[String(day)];
    qc.setQueryData(key, { ...q.data, rows: q.data.rows.map((r: any) => (r.employeeId === emp ? { ...r, daysData } : r)) });
    setMsg('');
    save.mutate({ emp, daysData });
  };

  const autofill = useMutation({
    mutationFn: () => api<{ updated: number }>('/timesheet/autofill', { method: 'POST', body: JSON.stringify({ year, month, ...(departmentId && { departmentId }) }) }),
    onSuccess: (r) => { setMsg(`Ish kunlari to'ldirildi (${r.updated} ta xodim)`); qc.invalidateQueries({ queryKey: key }); },
  });

  const shift = (d: number) => {
    const t = new Date(year, month - 1 + d, 1);
    setYear(t.getFullYear()); setMonth(t.getMonth() + 1);
  };
  const focusCell = (ri: number, day: number) => (document.getElementById(`c-${ri}-${day}`) as HTMLElement | null)?.focus();

  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!menu) return;
    const close = (e: MouseEvent) => { if (!menuRef.current?.contains(e.target as Node)) setMenu(null); };
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setMenu(null);
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc); };
  }, [menu]);

  const onKey = (e: React.KeyboardEvent, ri: number, row: any, day: number, n: number) => {
    const move = { ArrowRight: [0, 1], ArrowLeft: [0, -1], ArrowDown: [1, 0], ArrowUp: [-1, 0] }[e.key];
    if (move) { e.preventDefault(); focusCell(ri + move[0], Math.min(n, Math.max(1, day + move[1]))); return; }
    if (e.key === 'Backspace' || e.key === 'Delete') { e.preventDefault(); setCell(row.employeeId, day, null); return; }
    const c = CODES.find((x) => x.key === e.key.toLowerCase());
    if (c) { e.preventDefault(); setCell(row.employeeId, day, c.code); }
  };

  const t = q.data;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-navy">Табель</h1>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-lg border border-slate-300 bg-white">
            <button className="px-2 py-2 hover:bg-slate-50" onClick={() => shift(-1)} aria-label="Oldingi oy"><ChevronLeft size={16} /></button>
            <span className="min-w-[130px] text-center text-sm font-medium">{MONTHS[month - 1]} {year}</span>
            <button className="px-2 py-2 hover:bg-slate-50" onClick={() => shift(1)} aria-label="Keyingi oy"><ChevronRight size={16} /></button>
          </div>
          <select className="input w-auto" value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
            <option value="">Barcha bo'limlar</option>{departments.data?.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <button className="btn-secondary" onClick={() => autofill.mutate()} disabled={autofill.isPending}><Wand2 size={16} /> Avto to'ldirish</button>
          <a className="btn-primary" href={`/api/timesheet/export?year=${year}&month=${month}${departmentId ? `&departmentId=${departmentId}` : ''}`}><Download size={16} /> Excel</a>
        </div>
      </div>

      {t?.holidaysWarning && <p className="card border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">{year}-yil uchun hayit kunlari kiritilmagan (<code>holidays.ts</code>): ish kunlari va oylik noto'g'ri hisoblanishi mumkin.</p>}
      {msg && <p className="card p-3 text-sm">{msg}</p>}

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
        {CODES.filter((c) => c.code !== '7.2').map((c) => <span key={c.code} className="flex items-center gap-1.5"><span className={`rounded px-1.5 py-0.5 font-semibold ${c.cls}`}>{c.code}</span>{c.label}</span>)}
        <span className="text-slate-400">· Katakni tanlab 8, 7, M, K, B, S, T, X tugmalari yoki strelkalar bilan ishlang</span>
      </div>

      {q.isLoading && <p className="text-slate-500">Yuklanmoqda…</p>}
      {q.error && <p className="text-red-600">{(q.error as Error).message}</p>}
      {t && (
        <div className="card overflow-x-auto">
          <table className="w-full border-separate border-spacing-0 text-xs">
            <thead>
              <tr>
                <th className="th sticky left-0 z-20 min-w-[210px] border-b bg-slate-50" rowSpan={2}>Xodim</th>
                {t.days.map((d: any) => <th key={d.day} className={`border-b px-0 pt-1.5 text-center font-semibold ${d.off ? 'bg-slate-200 text-red-600' : 'bg-slate-50'}`}>{d.day}</th>)}
                <th className="th sticky right-0 z-20 min-w-[150px] border-b border-l bg-slate-50 text-right" rowSpan={2}>Jami / oylik</th>
              </tr>
              <tr>{t.days.map((d: any) => <th key={d.day} className={`border-b pb-1.5 text-center font-normal text-slate-500 ${d.off ? 'bg-slate-200' : 'bg-slate-50'}`}>{WD[d.weekday]}</th>)}</tr>
            </thead>
            <tbody>
              {t.rows.map((r: any, ri: number) => (
                <tr key={r.employeeId} className="group">
                  <td className="sticky left-0 z-10 border-b bg-white px-3 py-1.5 group-hover:bg-slate-50">
                    <div className="font-medium text-slate-800">{r.fullName}</div>
                    <div className="text-[11px] text-slate-500">{r.tabNumber} · {r.position}{r.employmentType === 'gpx' && ' · GPX'}</div>
                  </td>
                  {t.days.map((d: any) => {
                    const v = r.daysData[String(d.day)];
                    return (
                      <td key={d.day} className={`border-b p-0 ${d.off && !v ? 'bg-slate-100' : ''}`}>
                        <button
                          id={`c-${ri}-${d.day}`} title={CODES.find((c) => c.code === v)?.label}
                          className={`h-8 w-7 text-center text-[11px] font-semibold outline-none focus:ring-2 focus:ring-inset focus:ring-navy ${cls(v)}`}
                          onClick={(e) => { const b = (e.currentTarget as HTMLElement).getBoundingClientRect(); setMenu({ emp: r.employeeId, day: d.day, x: b.left, y: b.bottom }); }}
                          onKeyDown={(e) => onKey(e, ri, r, d.day, t.daysInMonth)}
                        >{v}</button>
                      </td>
                    );
                  })}
                  <td className="sticky right-0 z-10 border-b border-l bg-white px-3 py-1.5 text-right group-hover:bg-slate-50" title={`Kunlik oklad: ${fmtMoney(r.result.dailyRate)} · ${r.result.workingDays} ish kuni`}>
                    <div className="text-sm font-semibold text-navy">{fmtMoney(r.result.salary)}</div>
                    <div className="text-[11px] text-slate-500">{r.result.workedDays} kun · {r.result.totalHours} soat</div>
                  </td>
                </tr>
              ))}
              {t.rows.length === 0 && <tr><td colSpan={t.daysInMonth + 2} className="td py-10 text-center text-slate-500">Xodimlar topilmadi</td></tr>}
            </tbody>
          </table>
        </div>
      )}
      {t && <p className="text-xs text-slate-500">Oydagi ish kunlari: {t.rows[0]?.result.workingDays ?? '—'}. Oylik = ishlangan kunlar × kunlik oklad + kasallik × kunlik × 50%.</p>}

      {menu && (
        <div ref={menuRef} className="card fixed z-50 w-56 p-1 shadow-lg" style={{ left: Math.min(menu.x, window.innerWidth - 240), top: Math.min(menu.y + 4, window.innerHeight - 330) }}>
          {CODES.map((c) => (
            <button key={c.code} className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs hover:bg-slate-100" onClick={() => { setCell(menu.emp, menu.day, c.code); setMenu(null); }}>
              <span className={`w-9 rounded px-1 py-0.5 text-center font-semibold ${c.cls}`}>{c.code}</span>{c.label}
            </button>
          ))}
          <button className="mt-1 w-full rounded border-t px-2 py-1.5 text-left text-xs text-slate-500 hover:bg-slate-100" onClick={() => { setCell(menu.emp, menu.day, null); setMenu(null); }}>Tozalash</button>
        </div>
      )}
    </div>
  );
}
