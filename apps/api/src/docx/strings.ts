import { Lang } from './format';

/** Hujjatlarga avtomatik qo'yiladigan qat'iy matnlar (shablonlardan tashqari). */
export const DOC_STRINGS = {
  lat: {
    present: 'h.v.',
    year: 'y.',
    years: 'yy.',
    hireLine: (y: number, d: string, m: string) => `${y}-yil ${d} ${m}dan`,
    none: "yo'q",
    signer: 'Bosh direktor',
    orderPrefix: 'М-',
    leavePrefix: 'T-',
    hirePrefix: 'Q-',
    firePrefix: 'B-',
    rewardPrefix: 'R-',
    basisHire: (fish: string) => `${fish}ning arizasi va mehnat shartnomasi`,
    awardMoney: (m: string) => `${m} so'm miqdorida pul mukofoti berilsin`,
    basisLeave: (fish: string) => `${fish}ning arizasi va O'zR Mehnat kodeksining 216, 217, 221-moddalari`,
  },
  cyr: {
    present: 'ҳ.в.',
    year: 'й.',
    years: 'йй.',
    hireLine: (y: number, d: string, m: string) => `${y} йил ${d} ${m}дан`,
    none: 'йўқ',
    signer: 'Бош директор',
    orderPrefix: 'М-',
    leavePrefix: 'Т-',
    hirePrefix: 'Қ-',
    firePrefix: 'Б-',
    rewardPrefix: 'Р-',
    basisHire: (fish: string) => `${fish}нинг аризаси ва меҳнат шартномаси`,
    awardMoney: (m: string) => `${m} сўм миқдорида пул мукофоти берилсин`,
    basisLeave: (fish: string) => `${fish}нинг аризаси ва ЎзР Меҳнат кодексининг 216, 217, 221-моддалари`,
  },
} satisfies Record<Lang, unknown>;
