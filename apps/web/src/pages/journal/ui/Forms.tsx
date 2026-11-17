import { useMutation } from '@tanstack/react-query';
import { useState, type FormEvent, type ReactNode } from 'react';
import { Button, DatePicker, Field, Input, Modal, Select, Textarea } from '../../../components/kit';
import { ErrorNote } from '../../../components/ui';
import { api } from '../../../lib/api';
import { useT } from '../../../lib/script';
import { KB_STATUS, KB_STATUS_ORDER, todayIso } from '../labels';
import { useRefresh } from '../hooks';
import type { Kb, KbStatus, Org, Ticket, Training } from '../types';
import { OptionSelect, OrgPicker, TicketPicker } from './Pickers';
import { useScript } from '../../../lib/script';

const Actions = ({ onClose, pending }: { onClose: () => void; pending: boolean }) => {
  const t = useT();
  return <div className="flex justify-end gap-2 pt-2"><Button type="button" variant="secondary" onClick={onClose}>{t('Бекор қилиш')}</Button><Button type="submit" loading={pending}>{t('Сақлаш')}</Button></div>;
};
const NOTE = 'Парол, ЭРИ ёпиқ калитлари ва СМС-кодларни ёзманг. Шахсга доир маълумотни фақат хизмат зарурати доирасида киритинг.';
const SecurityNote = () => <p className="rounded-md border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-900">{useT()(NOTE)}</p>;

/** Сақлаш: POST/PATCH, кейин журнал маълумотлари янгиланади */
function useSave<T>(path: string, id: string | undefined, onSaved: (r: T) => void) {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: (body: object) => api<T>(`/journal/${path}${id ? '/' + id : ''}`, { method: id ? 'PATCH' : 'POST', body: JSON.stringify(body) }),
    onSuccess: async (r) => { await refresh(); onSaved(r); },
  });
}
const Form = ({ title, onClose, onSubmit, children, error, pending }: { title: string; onClose: () => void; onSubmit: () => void; children: ReactNode; error: unknown; pending: boolean }) => (
  <Modal title={title} onClose={onClose} wide>
    <form onSubmit={(e: FormEvent) => { e.preventDefault(); onSubmit(); }} className="space-y-4">{children}<SecurityNote /><ErrorNote error={error} /><Actions onClose={onClose} pending={pending} /></form>
  </Modal>
);

/* ───── Мурожаат ───── */
export function TicketForm({ ticket, onClose, onSaved }: { ticket: Ticket | null; onClose: () => void; onSaved?: (t: Ticket) => void }) {
  const t = useT();
  const [v, setV] = useState({
    code: ticket?.code ?? '', received: ticket?.received ?? todayIso(), orgId: ticket?.orgId ?? null as string | null, person: ticket?.person ?? '',
    channelId: ticket?.channelId ?? null as string | null, categoryId: ticket?.categoryId ?? null as string | null, priorityId: ticket?.priorityId ?? null as string | null,
    problem: ticket?.problem ?? '', actions: ticket?.actions ?? '', dept: ticket?.dept ?? '',
  });
  const set = <K extends keyof typeof v>(k: K, x: (typeof v)[K]) => setV((p) => ({ ...p, [k]: x }));
  const m = useSave<Ticket>('tickets', ticket?.id, (r) => { onSaved?.(r); onClose(); });
  return (
    <Form title={t(ticket ? 'Мурожаатни таҳрирлаш' : 'Янги мурожаат')} onClose={onClose} onSubmit={() => m.mutate(v)} error={m.error} pending={m.isPending}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t('Қабул қилинган сана') + ' *'}><DatePicker value={v.received} onChange={(x) => set('received', x)} required /></Field>
        <Field label={t('Мурожаат ID')} hint={t('Бўш қолса автоматик берилади')}><Input translit={false} value={v.code} onChange={(e) => set('code', e.target.value)} placeholder="M-2026-0001" /></Field>
        <Field label={t('Ташкилот')}><OrgPicker value={v.orgId} onChange={(id) => set('orgId', id)} /></Field>
        <Field label={t('Мурожаатчи')}><Input translit={false} value={v.person} onChange={(e) => set('person', e.target.value)} /></Field>
        <Field label={t('Категория')}><OptionSelect kind="category" value={v.categoryId} onChange={(id) => set('categoryId', id)} placeholder={t('Категория')} /></Field>
        <Field label={t('Устуворлик')}><OptionSelect kind="priority" value={v.priorityId} onChange={(id) => set('priorityId', id)} placeholder={t('Устуворлик')} /></Field>
        <Field label={t('Канал')}><OptionSelect kind="channel" value={v.channelId} onChange={(id) => set('channelId', id)} placeholder={t('Канал')} /></Field>
        <Field label={t('Йўналтирилган бўлим')}><Input translit={false} value={v.dept} onChange={(e) => set('dept', e.target.value)} /></Field>
        <Field label={t('Муаммо тавсифи') + ' *'} className="sm:col-span-2"><Textarea translit={false} rows={3} required value={v.problem} onChange={(e) => set('problem', e.target.value)} /></Field>
        <Field label={t('Кўрилган чоралар')} className="sm:col-span-2"><Textarea translit={false} rows={3} value={v.actions} onChange={(e) => set('actions', e.target.value)} /></Field>
      </div>
    </Form>
  );
}

/* ───── Ўқитиш ───── */
export function TrainingForm({ training, preset, onClose }: { training: Training | null; preset?: { ticketId?: string; orgId?: string | null }; onClose: () => void }) {
  const t = useT();
  const [v, setV] = useState({
    date: training?.date ?? todayIso(), orgId: training?.orgId ?? preset?.orgId ?? null as string | null, topic: training?.topic ?? '',
    formatId: training?.formatId ?? null as string | null, count: String(training?.count ?? ''), ticketId: training?.ticketId ?? preset?.ticketId ?? null as string | null,
    trainer: training?.trainer ?? '', result: training?.result ?? '',
  });
  const set = <K extends keyof typeof v>(k: K, x: (typeof v)[K]) => setV((p) => ({ ...p, [k]: x }));
  const m = useSave<Training>('trainings', training?.id, onClose);
  return (
    <Form title={t(training ? 'Ўқитишни таҳрирлаш' : 'Янги ўқитиш')} onClose={onClose} onSubmit={() => m.mutate({ ...v, count: Number(v.count || 0) })} error={m.error} pending={m.isPending}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t('Мавзу') + ' *'} className="sm:col-span-2"><Input translit={false} required value={v.topic} onChange={(e) => set('topic', e.target.value)} autoFocus /></Field>
        <Field label={t('Сана') + ' *'}><DatePicker value={v.date} onChange={(x) => set('date', x)} required /></Field>
        <Field label={t('Иштирокчилар сони') + ' *'}><Input type="number" min={0} required value={v.count} onChange={(e) => set('count', e.target.value)} /></Field>
        <Field label={t('Ташкилот')}><OrgPicker value={v.orgId} onChange={(id) => set('orgId', id)} /></Field>
        <Field label={t('Формат')}><OptionSelect kind="training_format" value={v.formatId} onChange={(id) => set('formatId', id)} placeholder={t('Формат')} /></Field>
        <Field label={t('Ўтказувчи')}><Input translit={false} value={v.trainer} onChange={(e) => set('trainer', e.target.value)} /></Field>
        <Field label={t('Сабаб бўлган мурожаат')}><TicketPicker value={v.ticketId} valueLabel={training?.ticket?.code} onChange={(id) => set('ticketId', id)} /></Field>
        <Field label={t('Натижа')} className="sm:col-span-2"><Textarea translit={false} rows={2} value={v.result} onChange={(e) => set('result', e.target.value)} /></Field>
      </div>
    </Form>
  );
}

/* ───── Билимлар базаси ───── */
export function KbForm({ kb, preset, onClose }: { kb: Kb | null; preset?: { ticketId?: string; categoryId?: string | null; question?: string }; onClose: () => void }) {
  const t = useT(), { script } = useScript();
  const [v, setV] = useState({
    code: kb?.code ?? '', created: kb?.created ?? todayIso(), categoryId: kb?.categoryId ?? preset?.categoryId ?? null as string | null, typeId: kb?.typeId ?? null as string | null,
    question: kb?.question ?? preset?.question ?? '', solution: kb?.solution ?? '', ticketId: kb?.ticketId ?? preset?.ticketId ?? null as string | null,
    link: kb?.link ?? '', version: kb?.version ?? '1.0', status: (kb?.status ?? 'draft') as KbStatus, review: kb?.review ?? '',
  });
  const set = <K extends keyof typeof v>(k: K, x: (typeof v)[K]) => setV((p) => ({ ...p, [k]: x }));
  const m = useSave<Kb>('kb', kb?.id, onClose);
  return (
    <Form title={t(kb ? 'Материални таҳрирлаш' : 'Янги материал')} onClose={onClose} onSubmit={() => m.mutate({ ...v, review: v.review || null })} error={m.error} pending={m.isPending}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t('Савол / муаммо') + ' *'} className="sm:col-span-2"><Textarea translit={false} rows={2} required value={v.question} onChange={(e) => set('question', e.target.value)} autoFocus /></Field>
        <Field label={t('Тавсия этилган ечим')} className="sm:col-span-2"><Textarea translit={false} rows={4} value={v.solution} onChange={(e) => set('solution', e.target.value)} /></Field>
        <Field label={t('Категория')}><OptionSelect kind="category" value={v.categoryId} onChange={(id) => set('categoryId', id)} placeholder={t('Категория')} /></Field>
        <Field label={t('Материал тури')}><OptionSelect kind="kb_type" value={v.typeId} onChange={(id) => set('typeId', id)} placeholder={t('Материал тури')} /></Field>
        <Field label={t('Ҳолат')}><Select value={v.status} onChange={(s) => set('status', s as KbStatus)} options={KB_STATUS_ORDER.map((s) => ({ value: s, label: KB_STATUS[s][script] }))} /></Field>
        <Field label={t('Версия')}><Input translit={false} value={v.version} onChange={(e) => set('version', e.target.value)} /></Field>
        <Field label={t('Манба мурожаат')}><TicketPicker value={v.ticketId} valueLabel={kb?.ticket?.code} onChange={(id) => set('ticketId', id)} /></Field>
        <Field label={t('Қайта кўриб чиқиш санаси')}><DatePicker value={v.review} onChange={(x) => set('review', x)} /></Field>
        <Field label={t('Ҳавола / файл номи')}><Input translit={false} value={v.link} onChange={(e) => set('link', e.target.value)} /></Field>
        <Field label={t('Материал ID')} hint={t('Бўш қолса автоматик берилади')}><Input translit={false} value={v.code} onChange={(e) => set('code', e.target.value)} placeholder="BB-0001" /></Field>
      </div>
    </Form>
  );
}

/* ───── Ташкилот ───── */
export function OrgForm({ org, onClose }: { org: Org | null; onClose: () => void }) {
  const t = useT();
  const [v, setV] = useState({ name: org?.name ?? '', region: org?.region ?? '', groupId: org?.groupId ?? null as string | null, note: org?.note ?? '' });
  const m = useSave<Org>('orgs', org?.id, onClose);
  return (
    <Modal title={t(org ? 'Ташкилотни таҳрирлаш' : 'Янги ташкилот')} onClose={onClose}>
      <form onSubmit={(e) => { e.preventDefault(); m.mutate(v); }} className="space-y-4">
        <Field label={t('Ташкилот номи') + ' *'}><Input translit={false} required autoFocus value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} /></Field>
        <Field label={t('Ҳудуд / туман')}><Input translit={false} value={v.region} onChange={(e) => setV({ ...v, region: e.target.value })} /></Field>
        <Field label={t('Мижозлар гуруҳи')}><OptionSelect kind="client_group" value={v.groupId} onChange={(id) => setV({ ...v, groupId: id })} placeholder={t('Мижозлар гуруҳи')} /></Field>
        <Field label={t('Изоҳ')}><Input translit={false} value={v.note} onChange={(e) => setV({ ...v, note: e.target.value })} /></Field>
        <ErrorNote error={m.error} />
        <Actions onClose={onClose} pending={m.isPending} />
      </form>
    </Modal>
  );
}
