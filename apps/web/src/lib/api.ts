/** Сессия тугаса — кириш саҳифасига (қайта юклаш ҳолатни тозалайди). */
export function onUnauthorized() {
  if (!['/login', '/setup'].includes(window.location.pathname)) window.location.assign('/login');
}

export async function api<T = any>(path: string, init?: RequestInit): Promise<T> {
  const isForm = init?.body instanceof FormData;
  const res = await fetch('/api' + path, {
    ...init,
    headers: isForm ? init?.headers : { 'Content-Type': 'application/json', ...init?.headers },
  });
  if (res.status === 401 && !path.startsWith('/auth/')) onUnauthorized();
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const msg = Array.isArray(body.message) ? body.message.join(', ') : body.message;
    throw new Error(msg || `Хатолик (${res.status})`);
  }
  return res.status === 204 ? (undefined as T) : res.json();
}

export const fmtDate = (d?: string | null) => (d ? new Date(d).toLocaleDateString('ru-RU') : '—');
export const fmtMoney = (v: unknown) => Number(v ?? 0).toLocaleString('ru-RU').replace(/,/g, ' ') + ' сўм';
export const fullName = (e: { lastName: string; firstName: string; middleName?: string | null }) =>
  [e.lastName, e.firstName, e.middleName].filter(Boolean).join(' ');

export const STATUS_LABEL: Record<string, string> = {
  ishlamoqda: 'Ишлаяпти', tatilda: 'Таътилда', ishdan_boshagan: 'Ишдан бўшаган',
};
export const GENDER_LABEL: Record<string, string> = { erkak: 'Эркак', ayol: 'Аёл' };
export const EMP_TYPE_LABEL: Record<string, string> = { shtat: 'Штат', gpx: 'ГПХ (шартнома)' };
export const CONTRACT_LABEL: Record<string, string> = { muddatsiz: 'Муддатсиз', muddatli: 'Муддатли' };

export const ROLE_LABEL: Record<string, string> = { superadmin: 'Суперадмин', kadrlar: 'Кадрлар ходими', buxgalter: 'Бухгалтер' };
