import type { KbStatus, TicketStatus } from './types';

type Tone = 'amber' | 'blue' | 'violet' | 'green' | 'grey' | 'red';
interface Label { cyr: string; lat: string; tone: Tone }

/** Ҳолатлар — рўйхат эмас, enum: номлари шу ерда (иккала ёзувда), ҳисобот номга эмас қийматга таянади. */
export const TICKET_STATUS: Record<TicketStatus, Label> = {
  registered: { cyr: 'Янги', lat: 'Yangi', tone: 'amber' },
  in_progress: { cyr: 'Жараёнда', lat: 'Jarayonda', tone: 'blue' },
  forwarded: { cyr: 'Бошқа бўлимга юборилди', lat: 'Boshqa bo‘limga yuborildi', tone: 'violet' },
  resolved: { cyr: 'Ҳал қилинди', lat: 'Hal qilindi', tone: 'green' },
  cancelled: { cyr: 'Бекор қилинди', lat: 'Bekor qilindi', tone: 'grey' },
};
export const KB_STATUS: Record<KbStatus, Label> = {
  draft: { cyr: 'Лойиҳа', lat: 'Loyiha', tone: 'blue' },
  active: { cyr: 'Амалда', lat: 'Amalda', tone: 'green' },
  needs_update: { cyr: 'Янгиланиш керак', lat: 'Yangilanish kerak', tone: 'amber' },
  archived: { cyr: 'Архив', lat: 'Arxiv', tone: 'grey' },
};
export const TICKET_STATUS_ORDER: TicketStatus[] = ['registered', 'in_progress', 'forwarded', 'resolved', 'cancelled'];
export const KB_STATUS_ORDER: KbStatus[] = ['draft', 'active', 'needs_update', 'archived'];

export const TONE: Record<Tone, string> = {
  amber: 'bg-amber-100 text-amber-900', blue: 'bg-blue-100 text-blue-900', violet: 'bg-violet-100 text-violet-900',
  green: 'bg-emerald-100 text-emerald-900', grey: 'bg-slate-100 text-slate-700', red: 'bg-red-100 text-red-900',
};
/** Устуворлик (рўйхат элементи) ранги: номига эмас, тартибига кўра эмас — энг юқори икки поғона огоҳлантиради */
export const priorityTone = (index: number, total: number): Tone => (total >= 3 && index >= total - 1 ? 'red' : total >= 3 && index === total - 2 ? 'amber' : 'grey');

export const MONTHS = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
export const WEEKDAYS = ['Якшанба', 'Душанба', 'Сешанба', 'Чоршанба', 'Пайшанба', 'Жума', 'Шанба'];

export const fmtD = (s?: string | null) => (s ? s.split('-').reverse().join('.') : '');
export const fmtMin = (m: number) => (m >= 60 ? `${Math.floor(m / 60)} соат${m % 60 ? ` ${m % 60} дақ.` : ''}` : `${m} дақ.`);
export const todayIso = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
export const daysBetween = (from: string, to: string) => Math.round((Date.parse(to) - Date.parse(from)) / 864e5);
export const weekdayOf = (iso: string) => WEEKDAYS[new Date(iso + 'T00:00:00').getDay()];
