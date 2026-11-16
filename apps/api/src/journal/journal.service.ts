import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthUser } from '../auth/decorators';
import { DEFAULT_LISTS, isClosed, LIST_KEYS, PROTECTED_STATUSES, SETTING_LISTS, SETTING_NORM, STATUS_CANCEL, STATUS_DONE, STATUS_FWD } from './journal.constants';
import type { EntryDto, KbDto, OrgDto, TicketDto, TrainingDto } from './journal.dto';
import { dayNum, durationMin, iso, normKey, toDate, ym } from './journal.util';

export interface ListQuery {
  q?: string; month?: string; status?: string; orgId?: string; ticketId?: string; mine?: string;
  page?: string; pageSize?: string;
}
const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;

/** Oy чегаралари: [бошланиши, кейинги ой бошланиши) */
function monthRange(m: string) {
  if (!MONTH.test(m)) throw new BadRequestException('Ой YYYY-MM кўринишида бўлиши керак');
  const [y, mm] = m.split('-').map(Number);
  return { gte: new Date(Date.UTC(y, mm - 1, 1)), lt: new Date(Date.UTC(y, mm, 1)) };
}
const paging = (q: ListQuery) => {
  const page = Math.max(Number(q.page) || 1, 1);
  const pageSize = Math.min(Math.max(Number(q.pageSize) || 50, 1), 200);
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
};
/** Prisma ёзувидаги Date майдонларини 'YYYY-MM-DD' қаторига айлантиради */
const out = <T extends Record<string, unknown>>(r: T, ...dates: string[]) => {
  const o: Record<string, unknown> = { ...r };
  for (const k of dates) o[k] = iso(r[k] as Date | null);
  return o;
};
const nullable = (v: string | null | undefined) => (v ? toDate(v) : null);

@Injectable()
export class JournalService {
  constructor(private prisma: PrismaService) {}

  /* ───────── Рўйхатлар ва созламалар ───────── */
  async getSettings() {
    const rows = await this.prisma.setting.findMany({ where: { key: { in: [SETTING_LISTS, SETTING_NORM] } } });
    const byKey = new Map(rows.map((r) => [r.key, r.value]));
    let saved: Record<string, string[]> = {};
    try { saved = JSON.parse(byKey.get(SETTING_LISTS) ?? '{}'); } catch { /* бузилган қиймат — бошланғичга қайтамиз */ }
    const lists: Record<string, string[]> = {};
    for (const k of LIST_KEYS) lists[k] = Array.isArray(saved[k]) && saved[k].length ? saved[k] : [...DEFAULT_LISTS[k]];
    return { lists, normDays: Number(byKey.get(SETTING_NORM) ?? 0) || 0 };
  }

  async updateSettings(dto: { normDays?: number; lists?: Record<string, string[]> }) {
    if (dto.lists) {
      const clean: Record<string, string[]> = {};
      for (const [k, v] of Object.entries(dto.lists)) {
        if (!(LIST_KEYS as string[]).includes(k)) throw new BadRequestException(`Номаълум рўйхат: ${k}`);
        if (!Array.isArray(v) || v.some((x) => typeof x !== 'string')) throw new BadRequestException(`Рўйхат нотўғри: ${k}`);
        const items = [...new Set(v.map((x) => x.trim()).filter(Boolean))];
        if (!items.length) throw new BadRequestException(`Рўйхат бўш бўлиши мумкин эмас: ${k}`);
        if (k === 'statuses') {
          const missing = PROTECTED_STATUSES.filter((s) => !items.includes(s));
          if (missing.length) throw new BadRequestException(`Ҳисобот таянадиган ҳолатларни ўчириб бўлмайди: ${missing.join(', ')}`);
        }
        clean[k] = items;
      }
      const cur = (await this.getSettings()).lists;
      await this.putSetting(SETTING_LISTS, JSON.stringify({ ...cur, ...clean }));
    }
    if (dto.normDays !== undefined) await this.putSetting(SETTING_NORM, String(dto.normDays));
    return this.getSettings();
  }
  private putSetting(key: string, value: string) {
    return this.prisma.setting.upsert({ where: { key }, update: { value }, create: { key, value } });
  }

  /* ───────── Ташкилотлар ───────── */
  async findOrCreateOrg(name: string, region = '', group = '') {
    const nameKey = normKey(name);
    const found = await this.prisma.journalOrg.findUnique({ where: { nameKey } });
    if (found) return found;
    return this.prisma.journalOrg.create({ data: { name: name.trim(), nameKey, region: region.trim(), group } });
  }

  async listOrgs(q?: string) {
    const orgs = await this.prisma.journalOrg.findMany({
      where: q ? { OR: [{ name: { contains: q, mode: 'insensitive' } }, { region: { contains: q, mode: 'insensitive' } }] } : undefined,
      include: { _count: { select: { tickets: true, entries: true, trainings: true } } },
      orderBy: { name: 'asc' },
    });
    const open = await this.prisma.journalTicket.groupBy({
      by: ['orgId'], where: { orgId: { not: null }, status: { notIn: [STATUS_DONE, STATUS_CANCEL] } }, _count: true,
    });
    const openBy = new Map(open.map((o) => [o.orgId, o._count]));
    return orgs.map(({ _count, ...o }) => ({ ...o, stats: { tickets: _count.tickets, open: openBy.get(o.id) ?? 0, entries: _count.entries, trainings: _count.trainings } }));
  }

  async orgHistory(id: string) {
    const org = await this.prisma.journalOrg.findUnique({
      where: { id },
      include: {
        tickets: { orderBy: { received: 'desc' } },
        entries: { orderBy: { date: 'desc' } },
        trainings: { orderBy: { date: 'desc' } },
      },
    });
    if (!org) throw new NotFoundException('Ташкилот топилмади');
    const { tickets, entries, trainings, ...rest } = org;
    return {
      ...rest,
      tickets: tickets.map((t) => out(t, 'received', 'resolved')),
      entries: entries.map((e) => out(e, 'date')),
      trainings: trainings.map((t) => out(t, 'date')),
    };
  }

  async createOrg(dto: OrgDto) {
    const nameKey = normKey(dto.name);
    if (await this.prisma.journalOrg.findUnique({ where: { nameKey } }))
      throw new ConflictException('Бундай ташкилот аллақачон мавжуд. Дубликатни бирлаштириш учун «бирлаштириш» дан фойдаланинг.');
    return this.prisma.journalOrg.create({ data: { ...dto, name: dto.name.trim(), nameKey } });
  }
  async updateOrg(id: string, dto: Partial<OrgDto>) {
    const data: Prisma.JournalOrgUpdateInput = { ...dto };
    if (dto.name !== undefined) {
      data.name = dto.name.trim();
      data.nameKey = normKey(dto.name);
      const dup = await this.prisma.journalOrg.findUnique({ where: { nameKey: data.nameKey as string } });
      if (dup && dup.id !== id) throw new ConflictException('Бундай ташкилот аллақачон мавжуд');
    }
    return this.prisma.journalOrg.update({ where: { id }, data });
  }
  removeOrg(id: string) { return this.prisma.journalOrg.delete({ where: { id } }); }   // FK: SetNull — ёзувлар сақланади

  /** `fromId` нинг барча ёзувлари `intoId` га ўтказилади, сўнг `fromId` ўчирилади. */
  async mergeOrg(fromId: string, intoId: string) {
    if (fromId === intoId) throw new BadRequestException('Ташкилотни ўзи билан бирлаштириб бўлмайди');
    return this.prisma.$transaction(async (tx) => {
      const [a, b] = await Promise.all([tx.journalOrg.findUnique({ where: { id: fromId } }), tx.journalOrg.findUnique({ where: { id: intoId } })]);
      if (!a || !b) throw new NotFoundException('Ташкилот топилмади');
      const where = { orgId: fromId }, data = { orgId: intoId };
      await tx.journalTicket.updateMany({ where, data });
      await tx.journalEntry.updateMany({ where, data });
      await tx.journalTraining.updateMany({ where, data });
      await tx.journalOrg.update({ where: { id: intoId }, data: { region: b.region || a.region, group: b.group || a.group } });
      await tx.journalOrg.delete({ where: { id: fromId } });
      return { merged: a.name, into: b.name };
    });
  }

  /* ───────── Умумий ёрдамчилар ───────── */
  private async assertRefs(orgId?: string | null, ticketId?: string | null) {
    if (orgId && !(await this.prisma.journalOrg.findUnique({ where: { id: orgId }, select: { id: true } }))) throw new BadRequestException('Ташкилот топилмади');
    if (ticketId && !(await this.prisma.journalTicket.findUnique({ where: { id: ticketId }, select: { id: true } }))) throw new BadRequestException('Мурожаат топилмади');
  }
  private async nextCode(prefix: string, table: 'journalTicket' | 'journalKb', year?: string): Promise<string> {
    const stem = year ? `${prefix}-${year}-` : `${prefix}-`;
    const last = await (this.prisma[table] as any).findFirst({ where: { code: { startsWith: stem } }, orderBy: { code: 'desc' }, select: { code: true } });
    const n = last ? Number(String(last.code).slice(stem.length)) || 0 : 0;
    return stem + String(n + 1).padStart(4, '0');
  }
  /** Код юнико: параллел сўровларда тўқнашса қайта уринади */
  private async createWithCode<T>(make: (code: string) => Promise<T>, prefix: string, table: 'journalTicket' | 'journalKb', year?: string, given?: string): Promise<T> {
    if (given) {
      try { return await make(given); }
      catch (e) { if ((e as { code?: string }).code === 'P2002') throw new ConflictException('Бундай ID аллақачон мавжуд'); throw e; }
    }
    for (let i = 0; i < 6; i++) {
      try { return await make(await this.nextCode(prefix, table, year)); }
      catch (e) { if ((e as { code?: string }).code !== 'P2002' || i === 5) throw e; }
    }
    throw new ConflictException('ID бериб бўлмади, қайта уриниб кўринг');
  }
  private textWhere(q: string | undefined, fields: string[]) {
    return q ? { OR: fields.map((f) => ({ [f]: { contains: q, mode: 'insensitive' } })) } : {};
  }

  /* ───────── Мурожаатлар ───────── */
  private ticketWhere(q: ListQuery, user: AuthUser): Prisma.JournalTicketWhereInput {
    return {
      ...(q.month && { received: monthRange(q.month) }),
      ...(q.status && { status: q.status }),
      ...(q.orgId && { orgId: q.orgId }),
      ...(q.mine === 'true' && { createdById: user.id }),
      ...(q.q && { OR: [
        { code: { contains: q.q, mode: 'insensitive' } }, { problem: { contains: q.q, mode: 'insensitive' } },
        { actions: { contains: q.q, mode: 'insensitive' } }, { person: { contains: q.q, mode: 'insensitive' } },
        { org: { name: { contains: q.q, mode: 'insensitive' } } },
      ] }),
    };
  }
  async listTickets(q: ListQuery, user: AuthUser) {
    const { page, pageSize, skip, take } = paging(q), where = this.ticketWhere(q, user);
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.journalTicket.findMany({
        where, skip, take, orderBy: [{ received: 'desc' }, { createdAt: 'desc' }],
        include: { org: { select: { id: true, name: true, region: true } }, _count: { select: { entries: true, kb: true, trainings: true } } },
      }),
      this.prisma.journalTicket.count({ where }),
    ]);
    return { items: rows.map((t) => this.ticketOut(t)), total, page, pageSize };
  }
  private ticketOut<T extends { received: Date; resolved: Date | null }>(t: T) {
    const days = t.resolved ? dayNum(t.resolved) - dayNum(t.received) : null;
    return { ...out(t as any, 'received', 'resolved'), days };
  }
  async getTicket(id: string) {
    const t = await this.prisma.journalTicket.findUnique({
      where: { id },
      include: { org: true, entries: { orderBy: { date: 'asc' } }, kb: true, trainings: { orderBy: { date: 'asc' } } },
    });
    if (!t) throw new NotFoundException('Мурожаат топилмади');
    const { entries, kb, trainings, ...rest } = t;
    const minutes = entries.reduce((s, e) => s + (durationMin(e.start, e.end) ?? 0), 0);
    return {
      ...this.ticketOut(rest),
      minutes,
      entries: entries.map((e) => ({ ...out(e, 'date'), durationMin: durationMin(e.start, e.end) })),
      kb: kb.map((k) => out(k, 'created', 'review')),
      trainings: trainings.map((r) => out(r, 'date')),
    };
  }
  private ticketData(dto: Partial<TicketDto>) {
    const { code, received, resolved, ...rest } = dto;
    const data: Record<string, unknown> = { ...rest };
    if (received !== undefined) data.received = toDate(received);
    if (resolved !== undefined) data.resolved = nullable(resolved);
    return data;
  }
  async createTicket(dto: TicketDto, user: AuthUser) {
    await this.assertRefs(dto.orgId);
    const status = dto.status || 'Yangi';
    const resolved = dto.resolved ?? (status === STATUS_DONE ? iso(new Date()) : null);
    if (resolved && resolved < dto.received) throw new BadRequestException('Ҳал этилган сана қабул қилинган санадан олдин бўлиши мумкин эмас');
    return this.createWithCode(
      async (code) => this.ticketOut(await this.prisma.journalTicket.create({
        data: { ...(this.ticketData({ ...dto, status, resolved }) as any), code, createdById: user.id },
      })),
      'M', 'journalTicket', dto.received.slice(0, 4), dto.code,
    );
  }
  async updateTicket(id: string, dto: Partial<TicketDto>) {
    const cur = await this.prisma.journalTicket.findUnique({ where: { id } });
    if (!cur) throw new NotFoundException('Мурожаат топилмади');
    await this.assertRefs(dto.orgId);
    const received = dto.received ?? iso(cur.received);
    let resolved = dto.resolved !== undefined ? dto.resolved : iso(cur.resolved) || null;
    if ((dto.status ?? cur.status) === STATUS_DONE && !resolved) resolved = iso(new Date());
    if (resolved && resolved < received) throw new BadRequestException('Ҳал этилган сана қабул қилинган санадан олдин бўлиши мумкин эмас');
    const data = this.ticketData({ ...dto, resolved });
    if (dto.code && dto.code !== cur.code) data.code = dto.code;
    try { return this.ticketOut(await this.prisma.journalTicket.update({ where: { id }, data: data as any })); }
    catch (e) { if ((e as { code?: string }).code === 'P2002') throw new ConflictException('Бундай мурожаат ID аллақачон мавжуд'); throw e; }
  }
  removeTicket(id: string) { return this.prisma.journalTicket.delete({ where: { id } }); }   // FK: SetNull

  /* ───────── Кундалик журнал ───────── */
  async listEntries(q: ListQuery, user: AuthUser) {
    const { page, pageSize, skip, take } = paging(q);
    const where: Prisma.JournalEntryWhereInput = {
      ...(q.month && { date: monthRange(q.month) }),
      ...(q.status && { status: q.status }),
      ...(q.orgId && { orgId: q.orgId }),
      ...(q.ticketId && { ticketId: q.ticketId }),
      ...(q.mine === 'true' && { createdById: user.id }),
      ...(q.q && { OR: [
        { content: { contains: q.q, mode: 'insensitive' } }, { done: { contains: q.q, mode: 'insensitive' } },
        { result: { contains: q.q, mode: 'insensitive' } }, { person: { contains: q.q, mode: 'insensitive' } },
        { org: { name: { contains: q.q, mode: 'insensitive' } } }, { ticket: { code: { contains: q.q, mode: 'insensitive' } } },
      ] }),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.journalEntry.findMany({
        where, skip, take, orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
        include: { org: { select: { id: true, name: true, region: true } }, ticket: { select: { id: true, code: true } } },
      }),
      this.prisma.journalEntry.count({ where }),
    ]);
    return { items: rows.map((e) => ({ ...out(e, 'date'), durationMin: durationMin(e.start, e.end) })), total, page, pageSize };
  }
  async createEntry(dto: EntryDto, user: AuthUser) {
    await this.assertRefs(dto.orgId, dto.ticketId);
    const orgId = dto.orgId ?? (dto.ticketId ? (await this.prisma.journalTicket.findUnique({ where: { id: dto.ticketId } }))?.orgId : null);
    const e = await this.prisma.journalEntry.create({ data: { ...dto, orgId, date: toDate(dto.date), createdById: user.id } as any });
    return { ...out(e, 'date'), durationMin: durationMin(e.start, e.end) };
  }
  async updateEntry(id: string, dto: Partial<EntryDto>) {
    await this.assertRefs(dto.orgId, dto.ticketId);
    const { date, ...rest } = dto;
    const e = await this.prisma.journalEntry.update({ where: { id }, data: { ...rest, ...(date && { date: toDate(date) }) } as any });
    return { ...out(e, 'date'), durationMin: durationMin(e.start, e.end) };
  }
  removeEntry(id: string) { return this.prisma.journalEntry.delete({ where: { id } }); }

  /* ───────── Ўқитиш ───────── */
  async listTrainings(q: ListQuery, user: AuthUser) {
    const { page, pageSize, skip, take } = paging(q);
    const where: Prisma.JournalTrainingWhereInput = {
      ...(q.month && { date: monthRange(q.month) }),
      ...(q.orgId && { orgId: q.orgId }),
      ...(q.ticketId && { ticketId: q.ticketId }),
      ...(q.mine === 'true' && { createdById: user.id }),
      ...this.textWhere(q.q, ['topic', 'trainer', 'result']),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.journalTraining.findMany({
        where, skip, take, orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
        include: { org: { select: { id: true, name: true, region: true } }, ticket: { select: { id: true, code: true } } },
      }),
      this.prisma.journalTraining.count({ where }),
    ]);
    return { items: rows.map((r) => out(r, 'date')), total, page, pageSize };
  }
  async createTraining(dto: TrainingDto, user: AuthUser) {
    await this.assertRefs(dto.orgId, dto.ticketId);
    return out(await this.prisma.journalTraining.create({ data: { ...dto, date: toDate(dto.date), createdById: user.id } as any }), 'date');
  }
  async updateTraining(id: string, dto: Partial<TrainingDto>) {
    await this.assertRefs(dto.orgId, dto.ticketId);
    const { date, ...rest } = dto;
    return out(await this.prisma.journalTraining.update({ where: { id }, data: { ...rest, ...(date && { date: toDate(date) }) } as any }), 'date');
  }
  removeTraining(id: string) { return this.prisma.journalTraining.delete({ where: { id } }); }

  /* ───────── Билимлар базаси ───────── */
  async listKb(q: ListQuery, user: AuthUser) {
    const { page, pageSize, skip, take } = paging(q);
    const where: Prisma.JournalKbWhereInput = {
      ...(q.month && { created: monthRange(q.month) }),
      ...(q.status && { status: q.status }),
      ...(q.ticketId && { ticketId: q.ticketId }),
      ...(q.mine === 'true' && { createdById: user.id }),
      ...this.textWhere(q.q, ['code', 'question', 'solution', 'category']),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.journalKb.findMany({
        where, skip, take, orderBy: [{ created: 'desc' }, { createdAt: 'desc' }],
        include: { ticket: { select: { id: true, code: true } } },
      }),
      this.prisma.journalKb.count({ where }),
    ]);
    return { items: rows.map((r) => out(r, 'created', 'review')), total, page, pageSize };
  }
  async createKb(dto: KbDto, user: AuthUser) {
    await this.assertRefs(null, dto.ticketId);
    return this.createWithCode(
      async (code) => out(await this.prisma.journalKb.create({
        data: { ...dto, code, created: toDate(dto.created), review: nullable(dto.review), createdById: user.id } as any,
      }), 'created', 'review'),
      'BB', 'journalKb', undefined, dto.code,
    );
  }
  async updateKb(id: string, dto: Partial<KbDto>) {
    await this.assertRefs(null, dto.ticketId);
    const { created, review, ...rest } = dto;
    const data: Record<string, unknown> = { ...rest };
    if (created) data.created = toDate(created);
    if (review !== undefined) data.review = nullable(review);
    try { return out(await this.prisma.journalKb.update({ where: { id }, data: data as any }), 'created', 'review'); }
    catch (e) { if ((e as { code?: string }).code === 'P2002') throw new ConflictException('Бундай материал ID аллақачон мавжуд'); throw e; }
  }
  removeKb(id: string) { return this.prisma.journalKb.delete({ where: { id } }); }

  /* ───────── Ойлик ҳисобот ───────── */
  /** `userId` берилса — фақат шу ходимнинг ёзувлари (ходим бўйича ҳисобот); берилмаса — бутун бўлим. */
  async report(month: string, userId?: string) {
    const r = monthRange(month);
    const by = userId ? { createdById: userId } : {};
    const { normDays: norm } = await this.getSettings();

    const [daily, recv, resolved, trainings, kb, openRaw] = await Promise.all([
      this.prisma.journalEntry.findMany({ where: { date: r, ...by } }),
      this.prisma.journalTicket.findMany({ where: { received: r, ...by }, include: { org: { select: { id: true, name: true, region: true } } } }),
      this.prisma.journalTicket.findMany({ where: { status: STATUS_DONE, resolved: r, ...by } }),
      this.prisma.journalTraining.findMany({ where: { date: r, ...by } }),
      this.prisma.journalKb.findMany({ where: { created: r, ...by } }),
      // Ой охирида очиқ: ой охиригача қабул қилинган ва (ҳозир ёпилмаган ёки «Ҳал қилинди» ойдан кейин бўлган). Эслатма: «Бекор қилинди» санаси сақланмагани учун бекор қилинганлар ўтган ойларда очиқ ҳисобланмайди — ҳолатлар тарихи келгуси босқичда.
      this.prisma.journalTicket.findMany({
        where: { received: { lt: r.lt }, ...by, OR: [{ status: { notIn: [STATUS_DONE, STATUS_CANCEL] } }, { status: STATUS_DONE, resolved: { gte: r.lt } }] },
        include: { org: { select: { name: true } } }, orderBy: { received: 'asc' },
      }),
    ]);
    const endOfMonth = new Date(r.lt.getTime() - 864e5);

    const minutes = daily.reduce((s, e) => s + (durationMin(e.start, e.end) ?? 0), 0);
    const dd = resolved.filter((t) => t.resolved).map((t) => dayNum(t.resolved!) - dayNum(t.received));
    const avgDays = dd.length ? Math.round((dd.reduce((a, b) => a + b, 0) / dd.length) * 10) / 10 : null;
    const inNormPct = norm > 0 && dd.length ? Math.round((dd.filter((x) => x <= norm).length / dd.length) * 100) : null;
    const count = <T>(arr: T[], key: (x: T) => string) => {
      const m = new Map<string, number>();
      for (const x of arr) { const k = key(x) || ''; m.set(k, (m.get(k) ?? 0) + 1); }
      return [...m].sort((a, b) => b[1] - a[1]).map(([name, n]) => ({ name, count: n }));
    };

    const orgs = new Map<string, { id: string; name: string; region: string; tickets: number; resolved: number; entries: number; trainings: number; users: number }>();
    const slot = (id: string | null, name = '', region = '') => {
      if (!id) return null;
      if (!orgs.has(id)) orgs.set(id, { id, name, region, tickets: 0, resolved: 0, entries: 0, trainings: 0, users: 0 });
      return orgs.get(id)!;
    };
    for (const t of recv) if (slot(t.orgId, t.org?.name, t.org?.region)) orgs.get(t.orgId!)!.tickets++;
    const names = await this.prisma.journalOrg.findMany({ select: { id: true, name: true, region: true } });
    const nameOf = new Map(names.map((o) => [o.id, o]));
    const fill = (id: string | null) => { const o = id ? slot(id, nameOf.get(id)?.name, nameOf.get(id)?.region) : null; if (o && !o.name) { o.name = nameOf.get(id!)?.name ?? ''; o.region = nameOf.get(id!)?.region ?? ''; } return o; };
    for (const t of resolved) fill(t.orgId) && orgs.get(t.orgId!)!.resolved++;
    for (const e of daily) fill(e.orgId) && orgs.get(e.orgId!)!.entries++;
    for (const t of trainings) { const o = fill(t.orgId); if (o) { o.trainings++; o.users += t.count; } }

    return {
      month, scope: userId ? 'user' : 'department', normDays: norm,
      kpi: {
        entries: daily.length, minutes,
        received: recv.length, resolved: resolved.length, forwarded: recv.filter((t) => t.status === STATUS_FWD).length,
        avgDays, inNormPct,
        entriesLinkedToTicket: daily.filter((e) => e.ticketId).length,
        trainings: trainings.length, trainedUsers: trainings.reduce((s, t) => s + t.count, 0),
        kb: kb.length, kbFromTicket: kb.filter((k) => k.ticketId).length,
      },
      byWorkType: count(daily, (e) => e.type),
      byCategory: count(recv, (t) => t.category),
      byGroup: count(recv, (t) => t.group),
      byStatus: count(recv, (t) => t.status),
      orgs: [...orgs.values()].sort((a, b) => (b.tickets + b.entries + b.trainings) - (a.tickets + a.entries + a.trainings)),
      open: openRaw.map((t) => ({
        id: t.id, code: t.code, received: iso(t.received), org: t.org?.name ?? '', problem: t.problem.slice(0, 200), status: t.status,
        ageDays: dayNum(endOfMonth) - dayNum(t.received),
      })),
    };
  }
}
