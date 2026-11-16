export type FieldType = 'text' | 'area' | 'date' | 'time' | 'number' | 'select' | 'org' | 'ticket';
export interface FieldDef { k: string; l: string; t: FieldType; req?: boolean; full?: boolean; list?: string; def?: string; hint?: string }
export interface ColDef { k: string; l: string }
export interface KindDef {
  key: 'tickets' | 'entries' | 'trainings' | 'kb';
  title: string; hint: string; statusList?: string; dateKey: string;
  fields: FieldDef[]; cols: ColDef[];
}

export const KINDS: Record<KindDef['key'], KindDef> = {
  entries: {
    key: 'entries', title: 'Кундалик журнал', dateKey: 'date', statusList: 'statuses',
    hint: 'Ҳар бир бажарилган ишни алоҳида қайд этинг. Давомийлик автоматик ҳисобланади.',
    fields: [
      { k: 'date', l: 'Сана', t: 'date', req: true, def: 'today' },
      { k: 'start', l: 'Бошланиш вақти', t: 'time' }, { k: 'end', l: 'Тугаш вақти', t: 'time' },
      { k: 'type', l: 'Иш тури', t: 'select', list: 'workTypes', req: true },
      { k: 'orgId', l: 'Ташкилот', t: 'org' }, { k: 'ticketId', l: 'Боғлиқ мурожаат', t: 'ticket' },
      { k: 'person', l: 'Мурожаатчи', t: 'text' }, { k: 'channel', l: 'Канал', t: 'select', list: 'channels' },
      { k: 'content', l: 'Мурожаат / топшириқ мазмуни', t: 'area', full: true },
      { k: 'done', l: 'Бажарилган иш', t: 'area', full: true },
      { k: 'result', l: 'Натижа', t: 'area', full: true },
      { k: 'status', l: 'Ҳолат', t: 'select', list: 'statuses' }, { k: 'next', l: 'Кейинги қадам', t: 'text' },
    ],
    cols: [{ k: 'date', l: 'Сана' }, { k: '_time', l: 'Вақт' }, { k: 'type', l: 'Иш тури' }, { k: 'orgId', l: 'Ташкилот' }, { k: 'ticketId', l: 'Мурожаат' }, { k: 'done', l: 'Бажарилган иш' }, { k: 'status', l: 'Ҳолат' }],
  },
  tickets: {
    key: 'tickets', title: 'Техник мурожаатлар', dateKey: 'received', statusList: 'statuses',
    hint: 'Мурожаатни рўйхатга олишдан якуний натижагача кузатув. Бўш қолдирилса ID автоматик берилади.',
    fields: [
      { k: 'code', l: 'Мурожаат ID', t: 'text', hint: 'Бўш қолса: M-йил-0001' },
      { k: 'received', l: 'Қабул қилинган сана', t: 'date', req: true, def: 'today' },
      { k: 'orgId', l: 'Ташкилот', t: 'org' }, { k: 'group', l: 'Гуруҳ', t: 'select', list: 'groups' },
      { k: 'person', l: 'Мурожаатчи', t: 'text' }, { k: 'channel', l: 'Канал', t: 'select', list: 'channels' },
      { k: 'category', l: 'Категория', t: 'select', list: 'categories' }, { k: 'priority', l: 'Устуворлик', t: 'select', list: 'priorities' },
      { k: 'problem', l: 'Муаммо тавсифи', t: 'area', req: true, full: true },
      { k: 'actions', l: 'Кўрилган чоралар', t: 'area', full: true },
      { k: 'dept', l: 'Йўналтирилган бўлим', t: 'text' }, { k: 'status', l: 'Ҳолат', t: 'select', list: 'statuses', def: 'Yangi' },
      { k: 'resolved', l: 'Ҳал этилган сана', t: 'date' },
    ],
    cols: [{ k: 'code', l: 'ID' }, { k: 'received', l: 'Қабул' }, { k: 'orgId', l: 'Ташкилот' }, { k: 'category', l: 'Категория' }, { k: 'priority', l: 'Устуворлик' }, { k: 'problem', l: 'Муаммо' }, { k: 'status', l: 'Ҳолат' }, { k: 'days', l: 'Муддат (кун)' }],
  },
  trainings: {
    key: 'trainings', title: 'Ўқитиш', dateKey: 'date',
    hint: 'Ўқув машғулотлари ва якка тушунтиришлар.',
    fields: [
      { k: 'date', l: 'Сана', t: 'date', req: true, def: 'today' }, { k: 'orgId', l: 'Ташкилот', t: 'org' },
      { k: 'topic', l: 'Мавзу', t: 'text', req: true, full: true },
      { k: 'format', l: 'Формат', t: 'select', list: 'formats' }, { k: 'count', l: 'Иштирокчилар сони', t: 'number', req: true, def: '0' },
      { k: 'ticketId', l: 'Сабаб бўлган мурожаат', t: 'ticket' }, { k: 'trainer', l: 'Ўтказувчи', t: 'text' },
      { k: 'result', l: 'Натижа', t: 'area', full: true },
    ],
    cols: [{ k: 'date', l: 'Сана' }, { k: 'orgId', l: 'Ташкилот' }, { k: 'topic', l: 'Мавзу' }, { k: 'format', l: 'Формат' }, { k: 'count', l: 'Иштирокчи' }, { k: 'trainer', l: 'Ўтказувчи' }],
  },
  kb: {
    key: 'kb', title: 'Билимлар базаси', dateKey: 'created', statusList: 'kbStatus',
    hint: 'Саволлар, ечимлар, қўлланма ва йўриқномалар ҳисоби.',
    fields: [
      { k: 'code', l: 'Материал ID', t: 'text', hint: 'Бўш қолса: BB-0001' },
      { k: 'created', l: 'Яратилган сана', t: 'date', req: true, def: 'today' },
      { k: 'category', l: 'Категория', t: 'select', list: 'categories' }, { k: 'type', l: 'Материал тури', t: 'select', list: 'kbTypes' },
      { k: 'question', l: 'Савол / муаммо', t: 'area', req: true, full: true },
      { k: 'solution', l: 'Тавсия этилган ечим', t: 'area', full: true },
      { k: 'ticketId', l: 'Манба мурожаат', t: 'ticket' }, { k: 'version', l: 'Версия', t: 'text', def: '1.0' },
      { k: 'status', l: 'Ҳолат', t: 'select', list: 'kbStatus', def: 'Loyiha' }, { k: 'review', l: 'Қайта кўриб чиқиш санаси', t: 'date' },
    ],
    cols: [{ k: 'code', l: 'ID' }, { k: 'created', l: 'Сана' }, { k: 'category', l: 'Категория' }, { k: 'type', l: 'Тури' }, { k: 'question', l: 'Савол' }, { k: 'version', l: 'Версия' }, { k: 'status', l: 'Ҳолат' }],
  },
};

export const fmtD = (s?: string | null) => (s ? s.split('-').reverse().join('.') : '');
export const fmtMin = (m: number) => (m >= 60 ? `${Math.floor(m / 60)} соат ${m % 60} дақ.` : `${m} дақ.`);
export const today = () => new Date().toISOString().slice(0, 10);

const GREEN = 'bg-emerald-100 text-emerald-800', BLUE = 'bg-blue-100 text-blue-800', AMBER = 'bg-amber-100 text-amber-800';
const VIOLET = 'bg-violet-100 text-violet-800', GREY = 'bg-slate-100 text-slate-600', RED = 'bg-red-100 text-red-800';
export const badgeCls = (v: string) => ({
  'Hal qilindi': GREEN, 'Jarayonda': BLUE, 'Yangi': AMBER, 'Boshqa bo‘limga yuborildi': VIOLET, 'Bekor qilindi': GREY,
  'Shoshilinch': RED, 'Yuqori': AMBER, 'Amalda': GREEN, 'Yangilanish kerak': AMBER, 'Arxiv': GREY, 'Loyiha': BLUE,
} as Record<string, string>)[v] ?? GREY;
