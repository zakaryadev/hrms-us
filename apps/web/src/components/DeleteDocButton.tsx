import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';
import { api } from '../lib/api';

/** Яратилган ҳужжат/буйруқни ўчириш тугмаси. kind: 'document' — ҳужжат, 'order' — буйруқ. */
export default function DeleteDocButton({ id, kind = 'document', label }: { id: string; kind?: 'document' | 'order'; label?: string }) {
  const qc = useQueryClient();
  const del = useMutation({
    mutationFn: () => api(kind === 'order' ? `/orders/${id}` : `/documents/generated/${id}`, { method: 'DELETE' }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['generated'] }); qc.invalidateQueries({ queryKey: ['orders'] }); },
    onError: (e: Error) => alert(e.message),
  });
  return (
    <button aria-label="Ўчириш" title="Ўчириш" disabled={del.isPending}
      className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
      onClick={() => confirm(`${label ?? 'Ҳужжат'} ўчирилсинми? Файл ҳам ўчади, қайтариб бўлмайди.`) && del.mutate()}>
      <Trash2 size={16} />
    </button>
  );
}
