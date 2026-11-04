import { Lang } from './format';

/** Hujjatlarga avtomatik qo'yiladigan qat'iy matnlar (shablonlardan tashqari). */
export const DOC_STRINGS = {
  lat: {
    present: 'h.v.',
    none: "yo'q",
    signer: 'Bosh direktor',
    orderPrefix: 'М-',
    leavePrefix: 'T-',
    basisLeave: (fish: string) => `${fish}ning arizasi va O'zR Mehnat kodeksining 216, 217, 221-moddalari`,
  },
  cyr: {
    present: 'ҳ.в.',
    none: 'йўқ',
    signer: 'Бош директор',
    orderPrefix: 'М-',
    leavePrefix: 'Т-',
    basisLeave: (fish: string) => `${fish}нинг аризаси ва ЎзР Меҳнат кодексининг 216, 217, 221-моддалари`,
  },
} satisfies Record<Lang, unknown>;
