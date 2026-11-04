import { randomBytes } from 'crypto';

export const COOKIE_NAME = 'hrms_token';
export const TOKEN_TTL_SECONDS = 12 * 60 * 60;

let cached: string | undefined;
/** JWT_SECRET productionda majburiy; devda har ishga tushishda tasodifiy (ogohlantirish bilan). */
export function jwtSecret(): string {
  if (cached) return cached;
  const env = process.env.JWT_SECRET;
  if (env && env.length >= 16) return (cached = env);
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET (kamida 16 belgi) productionda majburiy');
  }
  console.warn('[auth] JWT_SECRET berilmagan: tasodifiy kalit ishlatilmoqda (qayta ishga tushganda barcha sessiyalar tugaydi)');
  return (cached = randomBytes(32).toString('hex'));
}

export const cookieOptions = () => ({
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.COOKIE_SECURE === 'true',
  path: '/',
  maxAge: TOKEN_TTL_SECONDS * 1000,
});
