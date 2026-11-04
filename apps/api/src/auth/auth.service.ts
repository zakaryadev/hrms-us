import { BadRequestException, ForbiddenException, HttpException, HttpStatus, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { TOKEN_TTL_SECONDS } from './auth.constants';

const MAX_FAILS = 5;
const WINDOW_MS = 15 * 60 * 1000;
const BAD_CREDENTIALS = 'Логин ёки парол нотўғри';
// Мавжуд бўлмаган логин учун ҳам бир хил вақт сарфлаш (таймингдан фойдаланиб логинни аниқлашнинг олдини олиш)
const DUMMY_HASH = bcrypt.hashSync('dummy-password-for-timing', 10);

export function validatePassword(p: string) {
  if (typeof p !== 'string' || p.length < 8) throw new BadRequestException('Парол камида 8 та белгидан иборат бўлиши керак');
  if (p.length > 128) throw new BadRequestException('Парол жуда узун');
}

@Injectable()
export class AuthService {
  private fails = new Map<string, { count: number; first: number }>();

  constructor(private prisma: PrismaService, private jwt: JwtService) {}

  hash(password: string) { return bcrypt.hash(password, 10); }

  async needsSetup() { return (await this.prisma.user.count()) === 0; }

  /** Биринчи superadmin. Консуррент чақирувлардан pg advisory lock билан ҳимояланган. */
  async setup(data: { login: string; password: string; fullName: string }) {
    validatePassword(data.password);
    const passwordHash = await this.hash(data.password);
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(727001)`;
      if ((await tx.user.count()) > 0) throw new ForbiddenException('Тизим аллақачон созланган');
      return tx.user.create({ data: { login: data.login.toLowerCase(), passwordHash, fullName: data.fullName.trim(), role: 'superadmin' } });
    });
  }

  private throttleKey(login: string, ip: string) { return `${ip}|${login.toLowerCase()}`; }

  private checkThrottle(key: string) {
    const rec = this.fails.get(key);
    if (!rec) return;
    if (Date.now() - rec.first > WINDOW_MS) { this.fails.delete(key); return; }
    if (rec.count >= MAX_FAILS) {
      throw new HttpException('Кўп марта хато уриниш. 15 дақиқадан кейин қайта уриниб кўринг', HttpStatus.TOO_MANY_REQUESTS);
    }
  }

  private registerFail(key: string) {
    const rec = this.fails.get(key);
    if (!rec || Date.now() - rec.first > WINDOW_MS) this.fails.set(key, { count: 1, first: Date.now() });
    else rec.count++;
  }

  async login(login: string, password: string, ip: string) {
    const key = this.throttleKey(login, ip);
    this.checkThrottle(key);
    const user = await this.prisma.user.findUnique({ where: { login: login.toLowerCase() } });
    const ok = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
    if (!user || !ok || !user.active) {
      this.registerFail(key);
      throw new UnauthorizedException(BAD_CREDENTIALS);
    }
    this.fails.delete(key);
    return user;
  }

  sign(user: { id: string; role: string }) {
    return this.jwt.signAsync({ sub: user.id, role: user.role }, { expiresIn: TOKEN_TTL_SECONDS });
  }

  async changePassword(userId: string, oldPassword: string, newPassword: string) {
    validatePassword(newPassword);
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (!(await bcrypt.compare(oldPassword, user.passwordHash))) throw new BadRequestException('Жорий парол нотўғри');
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash: await this.hash(newPassword) } });
  }

  /** Тестлар учун */
  resetThrottle() { this.fails.clear(); }
}
