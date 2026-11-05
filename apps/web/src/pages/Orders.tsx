import { useQuery } from '@tanstack/react-query';
import { Download, User } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import DataTable, { actionBtn, iconBtn, type Column } from '../components/DataTable';
import DeleteDocButton from '../components/DeleteDocButton';
import { Select, buttonStyles, cn } from '../components/kit';
import { PageHeader } from '../components/ui';
import { api, fmtDate, fullName } from '../lib/api';

export const ORDER_LABEL: Record<string, string> = {
  ishga_qabul: 'Ишга қабул', lavozim_otkazish: 'Лавозимга ўтказиш', tatil_berish: 'Меҳнат таътили',
  ishdan_boshatish: 'Ишдан бўшатиш', ragbatlantirish: 'Рағбатлантириш',
};

export default function Orders() {
  const [type, setType] = useState('');
  const q = useQuery({ queryKey: ['orders', type], queryFn: () => api<any[]>(`/orders${type ? `?type=${type}` : ''}`) });
  const columns: Column<any>[] = [
    { key: 'orderNumber', header: '№', value: (o) => o.orderNumber, cell: (o) => <span className="font-medium">{o.orderNumber}</span>, nowrap: true },
    { key: 'orderDate', header: 'Сана', value: (o) => o.orderDate, cell: (o) => fmtDate(o.orderDate), nowrap: true },
    { key: 'type', header: 'Тури', value: (o) => ORDER_LABEL[o.orderType] ?? o.orderType },
    { key: 'employee', header: 'Ходим', locked: true, minWidth: '12rem', value: (o) => fullName(o.employee) },
    { key: 'tab', header: 'Табель', hidden: true, value: (o) => o.employee.tabNumber, nowrap: true },
    { key: 'createdAt', header: 'Яратилган', hidden: true, value: (o) => o.createdAt, cell: (o) => fmtDate(o.createdAt), nowrap: true },
  ];
  return (
    <div className="space-y-4">
      <PageHeader title="Буйруқлар" hint="Яратилган кадрлар буйруқлари (қабул, ўтказиш, таътил, бўшатиш, рағбатлантириш). DOCX файлни қайта юклаб олиш мумкин.">
        <a className={cn(buttonStyles({ variant: 'secondary' }))} href={`/api/orders/export${type ? `?type=${type}` : ''}`}><Download size={16} /> Excel</a>
      </PageHeader>
      <DataTable
        storageKey="orders" columns={columns} rows={q.data} rowKey={(o) => o.id} loading={q.isLoading} defaultSort={{ key: 'orderDate', dir: 'desc' }}
        searchPlaceholder="№, ходим ёки тури бўйича қидириш" emptyText="Буйруқлар йўқ. Ходим саҳифасидан «Ҳужжат яратиш» орқали яратилади."
        toolbar={
          <Select plain className="!w-auto" value={type} onChange={(v) => setType(v)}>
            <option value="">Барча турлар</option>{Object.entries(ORDER_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select>
        }
        actions={(o) => (
          <>
            {o.hasFile && <a className={actionBtn} href={`/api/orders/${o.id}/download`}><Download size={14} /> DOCX</a>}
            <Link to={`/employees/${o.employee.id}`} className={iconBtn} title="Ходим профили" aria-label="Ходим профили"><User size={16} /></Link>
            <DeleteDocButton id={o.id} kind="order" label={`Буйруқ № ${o.orderNumber}`} />
          </>
        )}
      />
    </div>
  );
}
