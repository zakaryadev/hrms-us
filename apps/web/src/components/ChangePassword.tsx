import { useMutation } from '@tanstack/react-query';
import { Save } from 'lucide-react';
import { useState } from 'react';
import { api } from '../lib/api';
import { Field, Modal } from './ui';
import { Button, Input } from './kit';

export default function ChangePassword({ onClose }: { onClose: () => void }) {
  const [f, setF] = useState({ oldPassword: '', newPassword: '', confirm: '' });
  const [localErr, setLocalErr] = useState('');
  const save = useMutation({
    mutationFn: () => api('/auth/change-password', { method: 'POST', body: JSON.stringify({ oldPassword: f.oldPassword, newPassword: f.newPassword }) }),
  });
  const submit = (e: React.FormEvent) => {
    e.preventDefault(); setLocalErr('');
    if (f.newPassword !== f.confirm) return setLocalErr('Пароллар мос келмади');
    save.mutate();
  };
  return (
    <Modal title="Паролни ўзгартириш" onClose={onClose}>
      {save.isSuccess ? (
        <div className="space-y-4"><p className="text-sm text-emerald-700">Парол ўзгартирилди.</p><div className="flex justify-end"><Button variant="primary"  onClick={onClose}>Ёпиш</Button></div></div>
      ) : (
        <form className="space-y-4" onSubmit={submit}>
          <Field label="Жорий парол"><Input required type="password" autoComplete="current-password" value={f.oldPassword} onChange={(e) => setF({ ...f, oldPassword: e.target.value })} /></Field>
          <Field label="Янги парол (камида 8 белги)"><Input required minLength={8} type="password" autoComplete="new-password" value={f.newPassword} onChange={(e) => setF({ ...f, newPassword: e.target.value })} /></Field>
          <Field label="Янги паролни тасдиқланг"><Input required type="password" autoComplete="new-password" value={f.confirm} onChange={(e) => setF({ ...f, confirm: e.target.value })} /></Field>
          {(localErr || save.error) && <p className="text-sm text-red-600" role="alert">{localErr || (save.error as Error).message}</p>}
          <div className="flex justify-end gap-2 border-t pt-4">
            <Button variant="secondary" type="button"  onClick={onClose}>Бекор қилиш</Button>
            <Button variant="primary"  disabled={save.isPending}><Save size={16} /> Сақлаш</Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
