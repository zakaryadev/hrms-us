import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { useState } from 'react';
import { api, fullName } from '../lib/api';
import { Input } from './kit';

/** Ходимни қидириб танлаш; танланганда тўлиқ маълумот (/employees/:id) билан onPick чақирилади. */
export default function EmployeePicker({ onPick, placeholder = 'Ходимни қидириш (Ф.И.Ш., табель рақами)…' }: { onPick: (e: any) => void; placeholder?: string }) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const res = useQuery({
    queryKey: ['picker', q], enabled: open,
    queryFn: () => api<any>(`/employees?archived=false&pageSize=8${q ? `&q=${encodeURIComponent(q)}` : ''}`),
  });
  return (
    <div className="relative w-full max-w-md">
      <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
      <Input className="pl-9" placeholder={placeholder} value={q} onFocus={() => setOpen(true)} onChange={(e) => { setQ(e.target.value); setOpen(true); }} onBlur={() => setTimeout(() => setOpen(false), 150)} />
      {open && (
        <ul className="card absolute z-30 mt-1 max-h-72 w-full overflow-y-auto p-1 shadow-lg">
          {res.data?.items.map((e: any) => (
            <li key={e.id}>
              <button type="button" className="w-full rounded px-3 py-2 text-left text-sm hover:bg-slate-100"
                onMouseDown={async () => { setOpen(false); setQ(''); onPick(await api(`/employees/${e.id}`)); }}>
                <span className="font-medium">{fullName(e)}</span>
                <span className="block text-xs text-slate-500">{e.tabNumber} · {e.position.title}</span>
              </button>
            </li>
          ))}
          {res.data?.items.length === 0 && <li className="px-3 py-2 text-sm text-slate-500">Топилмади</li>}
        </ul>
      )}
    </div>
  );
}
