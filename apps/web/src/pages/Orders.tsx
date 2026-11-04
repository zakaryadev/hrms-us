import { useQuery } from '@tanstack/react-query';
import { Download } from 'lucide-react';
import { useState } from 'react';
import { api, fmtDate, fullName } from '../lib/api';

export const ORDER_LABEL: Record<string, string> = {
  ishga_qabul: 'Ишга қабул', lavozim_otkazish: 'Лавозимга ўтказиш', tatil_berish: 'Меҳнат таътили',
  ishdan_boshatish: 'Ишдан бўшатиш', ragbatlantirish: 'Рағбатлантириш',
};

export default function Orders() {
  const [type, setType] = useState('');
  const q = useQuery({ queryKey: ['orders', type], queryFn: () => api<any[]>(`/orders${type ? `?type=${type}` : ''}`) });
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-navy">Буйруқлар</h1>
        <select className="input w-auto" value={type} onChange={(e) => setType(e.target.value)}>
          <option value="">Барча турлар</option>{Object.entries(ORDER_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full">
          <thead className="border-b bg-slate-50"><tr><th className="th">№</th><th className="th">Сана</th><th className="th">Тури</th><th className="th">Ходим</th><th /></tr></thead>
          <tbody className="divide-y">
            {q.data?.map((o) => (
              <tr key={o.id} className="hover:bg-slate-50">
                <td className="td font-medium">{o.orderNumber}</td><td className="td">{fmtDate(o.orderDate)}</td>
                <td className="td">{ORDER_LABEL[o.orderType] ?? o.orderType}</td><td className="td">{fullName(o.employee)}</td>
                <td className="td text-right">{o.hasFile && <a className="btn-secondary !px-3 !py-1.5" href={`/api/orders/${o.id}/download`}><Download size={14} /> DOCX</a>}</td>
              </tr>
            ))}
            {q.data?.length === 0 && <tr><td colSpan={5} className="td py-10 text-center text-slate-500">Буйруқлар йўқ. Ходим саҳифасидан «Ҳужжат яратиш» орқали яратилади.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
