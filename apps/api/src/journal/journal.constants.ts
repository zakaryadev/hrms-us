/** Журнал рўйхатлари (очиладиган танловлар) бошланғич қийматлари. Ўзгартирилгани `settings` жадвалида (`journal.lists`) сақланади. */
export const DEFAULT_LISTS = {
  workTypes: ['Texnik yordam', 'Maslahat', 'Monitoring', 'O‘qitish', 'Eskalatsiya', 'Bilimlar bazasi', 'Hisobot', 'Boshqa'],
  statuses: ['Yangi', 'Jarayonda', 'Boshqa bo‘limga yuborildi', 'Hal qilindi', 'Bekor qilindi'],
  channels: ['Telefon', 'Telegram', 'Elektron pochta', 'Shaxsan', 'Ichki topshiriq', 'Boshqa'],
  priorities: ['Past', 'O‘rta', 'Yuqori', 'Shoshilinch'],
  groups: ['№3', '№4'],
  formats: ['Yuzma-yuz', 'Onlayn', 'Telefon orqali', 'Individual maslahat', 'Guruhli mashg‘ulot'],
  categories: ['Tizimga kirish', 'ERI / imzolash', 'Hujjat yuborish', 'Hujjat holati', 'Rollar / huquqlar', 'Texnik xatolik', 'Foydalanish bo‘yicha savol', 'Boshqa'],
  kbStatus: ['Loyiha', 'Amalda', 'Yangilanish kerak', 'Arxiv'],
  kbTypes: ['Savol-javob', 'Yo‘riqnoma', 'Qo‘llanma', 'Video', 'Taqdimot'],
} as const;
export type ListKey = keyof typeof DEFAULT_LISTS;
export const LIST_KEYS = Object.keys(DEFAULT_LISTS) as ListKey[];

/** Ҳисобот шу уч қийматга таянади — рўйхатда ўзгартириб бўлмайди. */
export const STATUS_DONE = 'Hal qilindi';
export const STATUS_FWD = 'Boshqa bo‘limga yuborildi';
export const STATUS_CANCEL = 'Bekor qilindi';
export const PROTECTED_STATUSES = [STATUS_DONE, STATUS_FWD, STATUS_CANCEL];
export const isClosed = (status: string) => status === STATUS_DONE || status === STATUS_CANCEL;

export const SETTING_LISTS = 'journal.lists';
export const SETTING_NORM = 'journal.normDays';
