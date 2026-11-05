import { useQuery } from '@tanstack/react-query';
import { Download } from 'lucide-react';
import { useState } from 'react';
import { api, fmtDate, fullName } from '../lib/api';
import { Select, buttonStyles, cn } from '../components/kit';
import { PageHeader } from '../components/ui';
import DeleteDocButton from '../components/DeleteDocButton';

export const ORDER_LABEL: Record<string, string> = {
  ishga_qabul: 'Ишга қабул', lavozim_otkazish: 'Лавозимга ўтказиш', tatil_berish: 'Меҳнат таътили',
  ishdan_boshatish: 'Ишдан бўшатиш', ragbatlantirish: 'Рағбатлантириш',
};

export default function Orders() {
  const [type, setType] = useState('');
  const q = useQuery({ queryKey: ['orders', type], queryFn: () => api<any[]>(`/orders${type ? `?type=${type}` : ''}`) });
  return (
    <div className="space-y-4">
      <PageHeader title="Буйруқлар" hint="Яратилган кадрлар буйруқлари (қабул, ўтказиш, таътил, бўшатиш, рағбатлантириш). DOCX файлни қайта юклаб олиш мумкин.">
        <a className={cn(buttonStyles({ variant: 'secondary' }))} href={`/api/orders/export${type ? `?type=${type}` : ''}`}><Download size={16} /> Excel</a>
        <Select plain className="!w-auto" value={type} onChange={(v) => setType(v)}>
          <option value="">Барча турлар</option>{Object.entries(ORDER_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </Select>
      </PageHeader>
      <div className="card overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-slate-200"><tr><th className="th">№</th><th className="th">Сана</th><th className="th">Тури</th><th className="th">Ходим</th><th /></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {q.data?.map((o) => (
              <tr key={o.id} className="hover:bg-slate-50">
                <td className="td font-medium">{o.orderNumber}</td><td className="td whitespace-nowrap">{fmtDate(o.orderDate)}</td>
                <td className="td">{ORDER_LABEL[o.orderType] ?? o.orderType}</td><td className="td">{fullName(o.employee)}</td>
                <td className="td text-right"><div className="flex items-center justify-end gap-1">{o.hasFile && <a className={cn(buttonStyles({ variant: 'secondary', size: 'sm' }))} href={`/api/orders/${o.id}/download`}><Download size={14} /> DOCX</a>}<DeleteDocButton id={o.id} kind="order" label={`Буйруқ № ${o.orderNumber}`} /></div></td>
              </tr>
            ))}
            {q.data?.length === 0 && <tr><td colSpan={5} className="td py-10 text-center text-slate-500">Буйруқлар йўқ. Ходим саҳифасидан «Ҳужжат яратиш» орқали яратилади.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
