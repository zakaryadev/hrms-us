import { useMutation, useQueryClient } from '@tanstack/react-query';
import { FileSpreadsheet, Upload } from 'lucide-react';
import { useRef } from 'react';
import { api } from '../lib/api';

const COLS = ['Tabel raqami*', 'Familiya*', 'Ism*', 'Otasining ismi', "Tug'ilgan sana", 'Jinsi', 'Millati', 'Telefon', 'Manzil', 'JSHSHIR', 'Pasport', "Bo'lim*", 'Lavozim*', 'Turi', 'Ishga qabul sanasi', 'Oylik'];

export default function ImportPage() {
  const qc = useQueryClient();
  const ref = useRef<HTMLInputElement>(null);
  const run = useMutation({
    mutationFn: (file: File) => { const f = new FormData(); f.append('file', file); return api<{ created: number; updated: number; errors: { row: number; message: string }[] }>('/employees/import', { method: 'POST', body: f }); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['employees'] }); qc.invalidateQueries({ queryKey: ['stats'] }); },
  });
  const r = run.data;
  return (
    <div className="max-w-4xl space-y-4">
      <h1 className="text-2xl font-semibold text-navy">Excel’дан юклаш</h1>
      <div className="card space-y-4 p-5">
        <p className="text-sm text-slate-600">Ходимлар рўйхатини .xlsx файлдан юкланг. Биринчи қатор — устун номлари. Мавжуд табель рақами бўйича ходим янгиланади, янгиси қўшилади.</p>
        <div className="flex flex-wrap gap-1.5">{COLS.map((c) => <span key={c} className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-700">{c}</span>)}</div>
        <input ref={ref} type="file" accept=".xlsx,.xls" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) run.mutate(f); e.target.value = ''; }} />
        <button className="btn-primary" onClick={() => ref.current?.click()} disabled={run.isPending}><Upload size={16} /> Файлни танлаш</button>
        {run.error && <p className="text-sm text-red-600">{(run.error as Error).message}</p>}
      </div>
      {r && (
        <div className="card p-5">
          <div className="mb-3 flex items-center gap-2 font-semibold"><FileSpreadsheet size={18} className="text-blue-700" /> Натижа</div>
          <p className="text-sm">Қўшилди: <b>{r.created}</b> · Янгиланди: <b>{r.updated}</b> · Хато: <b className={r.errors.length ? 'text-red-600' : ''}>{r.errors.length}</b></p>
          {r.errors.length > 0 && (
            <table className="mt-3 w-full text-sm"><thead><tr><th className="th">Қатор</th><th className="th">Хато</th></tr></thead>
              <tbody className="divide-y">{r.errors.map((e) => <tr key={e.row}><td className="td">{e.row}</td><td className="td text-red-600">{e.message}</td></tr>)}</tbody></table>
          )}
        </div>
      )}
    </div>
  );
}
