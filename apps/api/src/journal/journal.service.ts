import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, TicketStatus } from '@prisma/client';
import type { AuthUser } from '../auth/decorators';
import { PrismaService } from '../prisma/prisma.service';
import { OPEN_STATUSES, SETTING_NORM } from './journal.constants';
import type { EntryDto, KbDto, OrgDto, TicketDto, TicketStatusDto, TrainingDto } from './journal.dto';
import { JournalOptionsService } from './journal-options.service';
import { dayNum, durationMin, iso, normKey, OPTION_SELECT, optionRef, todayIso, toDate } from './journal.util';

export interface ListQuery {
  q?: string; month?: string; status?: string; orgId?: string; ticketId?: string; mine?: string; open?: string;
  page?: string; pageSize?: string;
}
const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;
const ORG_REF = { select: { id: true, name: true, region: true } } as const;
const OPT = { select: OPTION_SELECT } as const;

/** Oy чегаралари: [бошланиши, кейинги ой бошланиши) */
export function monthRange(m: string) {
  if (!MONTH.test(m)) throw new BadRequestException('Ой YYYY-MM кўринишида бўлиши керак');
  const [y, mm] = m.split('-').map(Number);
  return { gte: new Date(Date.UTC(y, mm - 1, 1)), lt: new Date(Date.UTC(y, mm, 1)) };
}
const paging = (q: ListQuery) => {
  const page = Math.max(Number(q.page) || 1, 1);
  const pageSize = Math.min(Math.max(Number(q.pageSize) || 50, 1), 200);
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
};
const statusOf = (s?: string): TicketStatus | undefined => (Object.values(TicketStatus) as string[]).includes(s ?? '') ? (s as TicketStatus) : undefined;
const nullableDate = (v: string | null | undefined) => (v ? toDate(v) : null);
const isUnique = (e: unknown) => (e as { code?: string })?.code === 'P2002';

const ticketInclude = {
  org: ORG_REF, channel: OPT, category: OPT, priority: OPT,
  _count: { select: { entries: true, kb: true, trainings: true } },
} satisfies Prisma.JournalTicketInclude;
type TicketRow = Prisma.JournalTicketGetPayload<{ include: typeof ticketInclude }>;
const entryInclude = { type: OPT, channel: OPT, org: ORG_REF, ticket: { select: { id: true, code: true } } } satisfies Prisma.JournalEntryInclude;
type EntryRow = Prisma.JournalEntryGetPayload<{ include: typeof entryInclude }>;
const trainingInclude = { format: OPT, org: ORG_REF, ticket: { select: { id: true, code: true } } } satisfies Prisma.JournalTrainingInclude;
const kbInclude = { category: OPT, type: OPT, ticket: { select: { id: true, code: true } } } satisfies Prisma.JournalKbInclude;

@Injectable()
export class JournalService {
  constructor(private prisma: PrismaService, private options: JournalOptionsService) {}

  /* ───────── Умумий ───────── */
  async meta() {
    const [options, norm] = await Promise.all([this.options.listAll(), this.prisma.setting.findUnique({ where: { key: SETTING_NORM } })]);
    return { options, normDays: Number(norm?.value ?? 0) || 0 };
  }
  async setNormDays(normDays: number) {
    const value = String(normDays);
    await this.prisma.setting.upsert({ where: { key: SETTING_NORM }, update: { value }, create: { key: SETTING_NORM, value } });
    return { normDays };
  }

  private async assertRefs(orgId?: string | null, ticketId?: string | null) {
    if (orgId && !(await this.prisma.journalOrg.findUnique({ where: { id: orgId }, select: { id: true } }))) throw new BadRequestException('Ташкилот топилмади');
    if (ticketId && !(await this.prisma.journalTicket.findUnique({ where: { id: ticketId }, select: { id: true } }))) throw new BadRequestException('Мурожаат топилмади');
  }
  private contains(q: string | undefined, fields: string[]) {
    return q ? { OR: fields.map((f) => ({ [f]: { contains: q, mode: 'insensitive' as const } })) } : {};
  }

  /* ───────── Ташкилотлар ───────── */
  async listOrgs(q?: string) {
    const orgs = await this.prisma.journalOrg.findMany({
      where: q ? { OR: [{ name: { contains: q, mode: 'insensitive' } }, { region: { contains: q, mode: 'insensitive' } }] } : undefined,
      include: { group: OPT, _count: { select: { tickets: true, entries: true, trainings: true } } },
      orderBy: { name: 'asc' },
    });
    const open = await this.prisma.journalTicket.groupBy({ by: ['orgId'], where: { orgId: { not: null }, status: { in: OPEN_STATUSES } }, _count: true });
    const openBy = new Map(open.map((o) => [o.orgId, o._count]));
    return orgs.map(({ _count, group, groupId, ...o }) => ({
      ...o, groupId, group: optionRef(group),
      stats: { tickets: _count.tickets, open: openBy.get(o.id) ?? 0, entries: _count.entries, trainings: _count.trainings },
    }));
  }

  async orgHistory(id: string) {
    const org = await this.prisma.journalOrg.findUnique({
      where: { id },
      include: {
        group: OPT,
        tickets: { orderBy: { received: 'desc' }, include: { category: OPT } },
        entries: { orderBy: { date: 'desc' }, include: { type: OPT } },
        trainings: { orderBy: { date: 'desc' } },
      },
    });
    if (!org) throw new NotFoundException('Ташкилот топилмади');
    const { tickets, entries, trainings, group, ...rest } = org;
    return {
      ...rest, group: optionRef(group),
      tickets: tickets.map((t) => ({ id: t.id, code: t.code, received: iso(t.received), problem: t.problem, status: t.status, category: optionRef(t.category) })),
      entries: entries.map((e) => ({ id: e.id, date: iso(e.date), done: e.done, type: optionRef(e.type), durationMin: durationMin(e.start, e.end) })),
      trainings: trainings.map((t) => ({ id: t.id, date: iso(t.date), topic: t.topic, count: t.count })),
    };
  }

  async createOrg(dto: OrgDto) {
    await this.options.assertKinds([[dto.groupId, 'client_group']]);
    const nameKey = normKey(dto.name);
    if (await this.prisma.journalOrg.findUnique({ where: { nameKey } }))
      throw new ConflictException('Бундай ташкилот аллақачон мавжуд. Дубликатни бирлаштириш учун «бирлаштириш» дан фойдаланинг.');
    return this.prisma.journalOrg.create({ data: { ...dto, name: dto.name.trim(), nameKey } });
  }
  async updateOrg(id: string, dto: Partial<OrgDto>) {
    await this.options.assertKinds([[dto.groupId, 'client_group']]);
    const data: Prisma.JournalOrgUncheckedUpdateInput = { ...dto };
    if (dto.name !== undefined) {
      data.name = dto.name.trim();
      data.nameKey = normKey(dto.name);
      const dup = await this.prisma.journalOrg.findUnique({ where: { nameKey: data.nameKey } });
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
      await tx.journalOrg.update({ where: { id: intoId }, data: { region: b.region || a.region, groupId: b.groupId ?? a.groupId } });
      await tx.journalOrg.delete({ where: { id: fromId } });
      return { merged: a.name, into: b.name };
    });
  }

  /* ───────── Мурожаатлар ───────── */
  private ticketOut(t: TicketRow) {
    const { org, channel, category, priority, _count, resolvedAt, received, ...rest } = t;
    return {
      ...rest, org, received: iso(received), resolvedAt: iso(resolvedAt) || null,
      channel: optionRef(channel), category: optionRef(category), priority: optionRef(priority),
      days: resolvedAt ? dayNum(resolvedAt) - dayNum(received) : null,
      counts: { entries: _count.entries, kb: _count.kb, trainings: _count.trainings },
    };
  }
  private ticketWhere(q: ListQuery, user: AuthUser): Prisma.JournalTicketWhereInput {
    return {
      ...(q.month && { received: monthRange(q.month) }),
      ...(q.orgId && { orgId: q.orgId }),
      ...(q.open === 'true' && { status: { in: OPEN_STATUSES } }),
      ...(q.mine === 'true' && { createdById: user.id }),
      ...(q.q && { OR: [
        { code: { contains: q.q, mode: 'insensitive' } }, { problem: { contains: q.q, mode: 'insensitive' } },
        { actions: { contains: q.q, mode: 'insensitive' } }, { person: { contains: q.q, mode: 'insensitive' } },
        { org: { name: { contains: q.q, mode: 'insensitive' } } },
      ] }),
    };
  }
  /** Рўйхат + ҳолатлар бўйича сонлар (ҳолат фильтридан ташқари фильтрлар билан — «табларда» кўрсатиш учун). */
  async listTickets(q: ListQuery, user: AuthUser) {
    const { page, pageSize, skip, take } = paging(q);
    const base = this.ticketWhere(q, user), status = statusOf(q.status);
    const where: Prisma.JournalTicketWhereInput = status ? { ...base, status } : base;
    const [rows, total, grouped] = await this.prisma.$transaction([
      this.prisma.journalTicket.findMany({ where, skip, take, orderBy: [{ received: 'desc' }, { createdAt: 'desc' }], include: ticketInclude }),
      this.prisma.journalTicket.count({ where }),
      this.prisma.journalTicket.groupBy({ by: ['status'], where: base, _count: true, orderBy: { status: 'asc' } }),
    ]);
    const counts = Object.fromEntries(Object.values(TicketStatus).map((s) => [s, 0])) as Record<TicketStatus, number>;
    for (const g of grouped) counts[g.status] = (g._count as number) ?? 0;
    return { items: rows.map((t) => this.ticketOut(t)), total, page, pageSize, counts };
  }

  async getTicket(id: string) {
    const t = await this.prisma.journalTicket.findUnique({
      where: { id },
      include: {
        ...ticketInclude,
        entries: { orderBy: { date: 'asc' }, include: { type: OPT } },
        kb: { include: { category: OPT } },
        trainings: { orderBy: { date: 'asc' } },
        events: { orderBy: { at: 'asc' }, include: { by: { select: { fullName: true } } } },
      },
    });
    if (!t) throw new NotFoundException('Мурожаат топилмади');
    const { entries, kb, trainings, events, ...row } = t;
    return {
      ...this.ticketOut(row),
      minutes: entries.reduce((s, e) => s + (durationMin(e.start, e.end) ?? 0), 0),
      entries: entries.map((e) => ({ id: e.id, date: iso(e.date), start: e.start, end: e.end, done: e.done, type: optionRef(e.type), durationMin: durationMin(e.start, e.end) })),
      kb: kb.map((k) => ({ id: k.id, code: k.code, question: k.question, status: k.status })),
      trainings: trainings.map((r) => ({ id: r.id, date: iso(r.date), topic: r.topic, count: r.count })),
      events: events.map((e) => ({ id: e.id, status: e.status, at: e.at.toISOString(), by: e.by?.fullName ?? null, note: e.note })),
    };
  }

  private async nextTicketCode(year: string): Promise<string> {
    const stem = `M-${year}-`;
    const last = await this.prisma.journalTicket.findFirst({ where: { code: { startsWith: stem } }, orderBy: { code: 'desc' }, select: { code: true } });
    return stem + String((last ? Number(last.code.slice(stem.length)) || 0 : 0) + 1).padStart(4, '0');
  }

  async createTicket(dto: TicketDto, user: AuthUser) {
    await this.assertRefs(dto.orgId);
    await this.options.assertKinds([[dto.channelId, 'channel'], [dto.categoryId, 'category'], [dto.priorityId, 'priority']]);
    const { code, received, ...rest } = dto;
    const create = (c: string) => this.prisma.journalTicket.create({
      data: { ...rest, code: c, received: toDate(received), createdById: user.id, events: { create: { status: 'registered', at: toDate(received), byId: user.id } } },
      include: ticketInclude,
    });
    // ID: параллел сўровларда тўқнашса қайта уринади (юнико индекс ҳимоя қилади)
    if (code) {
      try { return this.ticketOut(await create(code)); }
      catch (e) { if (isUnique(e)) throw new ConflictException('Бундай мурожаат ID аллақачон мавжуд'); throw e; }
    }
    for (let i = 0; i < 6; i++) {
      try { return this.ticketOut(await create(await this.nextTicketCode(received.slice(0, 4)))); }
      catch (e) { if (!isUnique(e) || i === 5) throw e; }
    }
    throw new ConflictException('ID бериб бўлмади, қайта уриниб кўринг');
  }

  async updateTicket(id: string, dto: Partial<TicketDto>) {
    const cur = await this.prisma.journalTicket.findUnique({ where: { id }, select: { id: true, code: true, resolvedAt: true } });
    if (!cur) throw new NotFoundException('Мурожаат топилмади');
    await this.assertRefs(dto.orgId);
    await this.options.assertKinds([[dto.channelId, 'channel'], [dto.categoryId, 'category'], [dto.priorityId, 'priority']]);
    const { code, received, ...rest } = dto;
    if (received && cur.resolvedAt && received > iso(cur.resolvedAt)) throw new BadRequestException('Қабул санаси ҳал этилган санадан кейин бўлиши мумкин эмас');
    try {
      const t = await this.prisma.journalTicket.update({
        where: { id },
        data: { ...rest, ...(received && { received: toDate(received) }), ...(code && code !== cur.code && { code }) },
        include: ticketInclude,
      });
      return this.ticketOut(t);
    } catch (e) { if (isUnique(e)) throw new ConflictException('Бундай мурожаат ID аллақачон мавжуд'); throw e; }
  }

  /** Ҳолатни ўзгартириш: тарихга ёзилади; «Ҳал қилинди» бўлса сана қўйилади, бошқа ҳолатга қайтса сана олиб ташланади. */
  async setTicketStatus(id: string, dto: TicketStatusDto, user: AuthUser) {
    const t = await this.prisma.journalTicket.findUnique({ where: { id }, select: { status: true, received: true } });
    if (!t) throw new NotFoundException('Мурожаат топилмади');
    const date = dto.date ?? todayIso();
    if (dto.status === 'resolved' && (date < iso(t.received) || date > todayIso()))
      throw new BadRequestException('Ҳал этилган сана қабул санасидан олдин ёки келажакда бўлиши мумкин эмас');
    if (t.status === dto.status) return this.ticketOut(await this.prisma.journalTicket.findUniqueOrThrow({ where: { id }, include: ticketInclude }));
    const at = dto.date && dto.date < todayIso() ? new Date(dto.date + 'T12:00:00.000Z') : new Date();
    const updated = await this.prisma.journalTicket.update({
      where: { id },
      data: {
        status: dto.status,
        resolvedAt: dto.status === 'resolved' ? toDate(date) : null,
        events: { create: { status: dto.status, at, byId: user.id, note: dto.note ?? '' } },
      },
      include: ticketInclude,
    });
    return this.ticketOut(updated);
  }
  removeTicket(id: string) { return this.prisma.journalTicket.delete({ where: { id } }); }   // FK: SetNull (тарих — Cascade)

  /* ───────── Кундалик журнал ───────── */
  private entryOut(e: EntryRow) {
    const { type, channel, date, ...rest } = e;
    return { ...rest, date: iso(date), type: optionRef(type), channel: optionRef(channel), durationMin: durationMin(e.start, e.end) };
  }
  async listEntries(q: ListQuery, user: AuthUser) {
    const { page, pageSize, skip, take } = paging(q);
    const where: Prisma.JournalEntryWhereInput = {
      ...(q.month && { date: monthRange(q.month) }),
      ...(q.orgId && { orgId: q.orgId }),
      ...(q.ticketId && { ticketId: q.ticketId }),
      ...(q.mine === 'true' && { createdById: user.id }),
      ...(q.q && { OR: [
        { done: { contains: q.q, mode: 'insensitive' } }, { result: { contains: q.q, mode: 'insensitive' } }, { person: { contains: q.q, mode: 'insensitive' } },
        { org: { name: { contains: q.q, mode: 'insensitive' } } }, { ticket: { code: { contains: q.q, mode: 'insensitive' } } },
      ] }),
    };
    const [rows, total, times] = await this.prisma.$transaction([
      this.prisma.journalEntry.findMany({ where, skip, take, orderBy: [{ date: 'desc' }, { start: 'desc' }, { createdAt: 'desc' }], include: entryInclude }),
      this.prisma.journalEntry.count({ where }),
      this.prisma.journalEntry.findMany({ where, select: { start: true, end: true } }),
    ]);
    const minutes = times.reduce((s, e) => s + (durationMin(e.start, e.end) ?? 0), 0);
    return { items: rows.map((e) => this.entryOut(e)), total, page, pageSize, minutes };
  }
  async createEntry(dto: EntryDto, user: AuthUser) {
    await this.assertRefs(dto.orgId, dto.ticketId);
    await this.options.assertKinds([[dto.typeId, 'work_type'], [dto.channelId, 'channel']]);
    const { date, ...rest } = dto;
    const orgId = dto.orgId ?? (dto.ticketId ? (await this.prisma.journalTicket.findUnique({ where: { id: dto.ticketId }, select: { orgId: true } }))?.orgId : null);
    return this.entryOut(await this.prisma.journalEntry.create({ data: { ...rest, orgId, date: toDate(date), createdById: user.id }, include: entryInclude }));
  }
  async updateEntry(id: string, dto: Partial<EntryDto>) {
    await this.assertRefs(dto.orgId, dto.ticketId);
    await this.options.assertKinds([[dto.typeId, 'work_type'], [dto.channelId, 'channel']]);
    const { date, ...rest } = dto;
    return this.entryOut(await this.prisma.journalEntry.update({ where: { id }, data: { ...rest, ...(date && { date: toDate(date) }) }, include: entryInclude }));
  }
  removeEntry(id: string) { return this.prisma.journalEntry.delete({ where: { id } }); }

  /* ───────── Ўқитиш ───────── */
  private trainingOut(r: Prisma.JournalTrainingGetPayload<{ include: typeof trainingInclude }>) {
    const { format, date, ...rest } = r;
    return { ...rest, date: iso(date), format: optionRef(format) };
  }
  async listTrainings(q: ListQuery, user: AuthUser) {
    const { page, pageSize, skip, take } = paging(q);
    const where: Prisma.JournalTrainingWhereInput = {
      ...(q.month && { date: monthRange(q.month) }), ...(q.orgId && { orgId: q.orgId }), ...(q.ticketId && { ticketId: q.ticketId }),
      ...(q.mine === 'true' && { createdById: user.id }), ...this.contains(q.q, ['topic', 'trainer', 'result']),
    };
    const [rows, total, users] = await this.prisma.$transaction([
      this.prisma.journalTraining.findMany({ where, skip, take, orderBy: [{ date: 'desc' }, { createdAt: 'desc' }], include: trainingInclude }),
      this.prisma.journalTraining.count({ where }),
      this.prisma.journalTraining.aggregate({ where, _sum: { count: true } }),
    ]);
    return { items: rows.map((r) => this.trainingOut(r)), total, page, pageSize, participants: users._sum.count ?? 0 };
  }
  async createTraining(dto: TrainingDto, user: AuthUser) {
    await this.assertRefs(dto.orgId, dto.ticketId);
    await this.options.assertKinds([[dto.formatId, 'training_format']]);
    const { date, ...rest } = dto;
    return this.trainingOut(await this.prisma.journalTraining.create({ data: { ...rest, date: toDate(date), createdById: user.id }, include: trainingInclude }));
  }
  async updateTraining(id: string, dto: Partial<TrainingDto>) {
    await this.assertRefs(dto.orgId, dto.ticketId);
    await this.options.assertKinds([[dto.formatId, 'training_format']]);
    const { date, ...rest } = dto;
    return this.trainingOut(await this.prisma.journalTraining.update({ where: { id }, data: { ...rest, ...(date && { date: toDate(date) }) }, include: trainingInclude }));
  }
  removeTraining(id: string) { return this.prisma.journalTraining.delete({ where: { id } }); }

  /* ───────── Билимлар базаси ───────── */
  private kbOut(r: Prisma.JournalKbGetPayload<{ include: typeof kbInclude }>) {
    const { category, type, created, review, ...rest } = r;
    return { ...rest, created: iso(created), review: iso(review) || null, category: optionRef(category), type: optionRef(type) };
  }
  async listKb(q: ListQuery, user: AuthUser) {
    const { page, pageSize, skip, take } = paging(q);
    const status = (['draft', 'active', 'needs_update', 'archived'] as const).find((s) => s === q.status);
    const where: Prisma.JournalKbWhereInput = {
      ...(q.month && { created: monthRange(q.month) }), ...(status && { status }), ...(q.ticketId && { ticketId: q.ticketId }),
      ...(q.mine === 'true' && { createdById: user.id }), ...this.contains(q.q, ['code', 'question', 'solution']),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.journalKb.findMany({ where, skip, take, orderBy: [{ created: 'desc' }, { createdAt: 'desc' }], include: kbInclude }),
      this.prisma.journalKb.count({ where }),
    ]);
    return { items: rows.map((r) => this.kbOut(r)), total, page, pageSize };
  }
  async createKb(dto: KbDto, user: AuthUser) {
    await this.assertRefs(null, dto.ticketId);
    await this.options.assertKinds([[dto.categoryId, 'category'], [dto.typeId, 'kb_type']]);
    const { code, created, review, ...rest } = dto;
    const make = async (c: string) => this.kbOut(await this.prisma.journalKb.create({
      data: { ...rest, code: c, created: toDate(created), review: nullableDate(review), createdById: user.id }, include: kbInclude,
    }));
    if (code) {
      try { return await make(code); } catch (e) { if (isUnique(e)) throw new ConflictException('Бундай ID аллақачон мавжуд'); throw e; }
    }
    for (let i = 0; i < 6; i++) {
      const last = await this.prisma.journalKb.findFirst({ where: { code: { startsWith: 'BB-' } }, orderBy: { code: 'desc' }, select: { code: true } });
      const next = 'BB-' + String((last ? Number(last.code.slice(3)) || 0 : 0) + 1).padStart(4, '0');
      try { return await make(next); } catch (e) { if (!isUnique(e) || i === 5) throw e; }
    }
    throw new ConflictException('ID бериб бўлмади, қайта уриниб кўринг');
  }
  async updateKb(id: string, dto: Partial<KbDto>) {
    await this.assertRefs(null, dto.ticketId);
    await this.options.assertKinds([[dto.categoryId, 'category'], [dto.typeId, 'kb_type']]);
    const { created, review, ...rest } = dto;
    try {
      return this.kbOut(await this.prisma.journalKb.update({
        where: { id }, data: { ...rest, ...(created && { created: toDate(created) }), ...(review !== undefined && { review: nullableDate(review) }) }, include: kbInclude,
      }));
    } catch (e) { if (isUnique(e)) throw new ConflictException('Бундай материал ID аллақачон мавжуд'); throw e; }
  }
  removeKb(id: string) { return this.prisma.journalKb.delete({ where: { id } }); }
}

