import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { OPEN_STATUSES } from './journal.constants';
import { JournalService, monthRange } from './journal.service';
import { dayNum, durationMin, iso, OPTION_SELECT, optionRef, type OptionRef } from './journal.util';

const byCount = <T>(arr: T[], key: (x: T) => OptionRef | string | null | undefined) => {
  const m = new Map<string, { name: OptionRef | string | null; count: number }>();
  for (const x of arr) {
    const k = key(x) ?? null, id = typeof k === 'string' ? k : k?.id ?? '';
    const cur = m.get(id) ?? { name: k, count: 0 };
    cur.count++; m.set(id, cur);
  }
  return [...m.values()].sort((a, b) => b.count - a.count);
};

/** Ойлик ҳисобот. Ҳолат ўзгаришлари тарихидан ҳисобланади — кейинги ўзгаришлар ўтган ой натижасини бузмайди. */
@Injectable()
export class JournalReportService {
  constructor(private prisma: PrismaService, private journal: JournalService) {}

  /** `userId` берилса — фақат шу ходимнинг ёзувлари; берилмаса — бутун бўлим. */
  async report(month: string, userId?: string) {
    const r = monthRange(month);
    const mine = userId ? { createdById: userId } : {};
    const { normDays } = await this.journal.meta();
    const opt = { select: OPTION_SELECT } as const;

    const [entries, received, resolvedEv, forwardedEv, trainings, kb, candidates] = await Promise.all([
      this.prisma.journalEntry.findMany({ where: { date: r, ...mine }, include: { type: opt, org: { select: { id: true, name: true, region: true } } } }),
      this.prisma.journalTicket.findMany({
        where: { received: r, ...mine },
        include: { org: { select: { id: true, name: true, region: true, group: opt } }, category: opt },
      }),
      this.eventsOf('resolved', r, mine),
      this.eventsOf('forwarded', r, mine),
      this.prisma.journalTraining.findMany({ where: { date: r, ...mine }, include: { org: { select: { id: true, name: true, region: true } } } }),
      this.prisma.journalKb.findMany({ where: { created: r, ...mine } }),
      // «Ой охирида очиқ»: ой охиригача қабул қилинганлар; ҳолат — ой охиридаги охирги ҳодиса бўйича
      this.prisma.journalTicket.findMany({
        where: { received: { lt: r.lt }, ...mine },
        include: { org: { select: { name: true } }, events: { where: { at: { lt: r.lt } }, orderBy: { at: 'desc' }, take: 1 } },
        orderBy: { received: 'asc' },
      }),
    ]);

    const endOfMonth = new Date(r.lt.getTime() - 864e5);
    const minutes = entries.reduce((s, e) => s + (durationMin(e.start, e.end) ?? 0), 0);
    const days = resolvedEv.map((e) => dayNum(e.at) - dayNum(e.ticket.received)).filter((d) => d >= 0);
    const avgDays = days.length ? Math.round((days.reduce((a, b) => a + b, 0) / days.length) * 10) / 10 : null;
    const inNormPct = normDays > 0 && days.length ? Math.round((days.filter((d) => d <= normDays).length / days.length) * 100) : null;

    const orgs = new Map<string, { id: string; name: string; region: string; tickets: number; resolved: number; entries: number; trainings: number; users: number }>();
    const slot = (o: { id: string; name: string; region: string } | null | undefined) => {
      if (!o) return null;
      if (!orgs.has(o.id)) orgs.set(o.id, { id: o.id, name: o.name, region: o.region, tickets: 0, resolved: 0, entries: 0, trainings: 0, users: 0 });
      return orgs.get(o.id)!;
    };
    for (const t of received) { const s = slot(t.org); if (s) s.tickets++; }
    for (const e of entries) { const s = slot(e.org); if (s) s.entries++; }
    for (const t of trainings) { const s = slot(t.org); if (s) { s.trainings++; s.users += t.count; } }
    const orgOf = new Map((await this.prisma.journalOrg.findMany({ select: { id: true, name: true, region: true } })).map((o) => [o.id, o]));
    for (const e of resolvedEv) { const s = slot(e.ticket.orgId ? orgOf.get(e.ticket.orgId) : null); if (s) s.resolved++; }

    const open = candidates
      .filter((t) => t.events[0] && OPEN_STATUSES.includes(t.events[0].status))
      .map((t) => ({
        id: t.id, code: t.code, received: iso(t.received), org: t.org?.name ?? '', problem: t.problem.slice(0, 200),
        status: t.events[0].status, ageDays: dayNum(endOfMonth) - dayNum(t.received),
      }));

    return {
      month, scope: userId ? 'user' : 'department', normDays,
      kpi: {
        entries: entries.length, minutes, received: received.length, resolved: resolvedEv.length, forwarded: forwardedEv.length,
        avgDays, inNormPct, entriesLinkedToTicket: entries.filter((e) => e.ticketId).length,
        trainings: trainings.length, trainedUsers: trainings.reduce((s, t) => s + t.count, 0),
        kb: kb.length, kbFromTicket: kb.filter((k) => k.ticketId).length,
      },
      byWorkType: byCount(entries, (e) => optionRef(e.type)),
      byCategory: byCount(received, (t) => optionRef(t.category)),
      byGroup: byCount(received, (t) => optionRef(t.org?.group)),
      byStatus: byCount(received, (t) => t.status).map((x) => ({ status: x.name as string, count: x.count })),
      orgs: [...orgs.values()].sort((a, b) => (b.tickets + b.entries + b.trainings) - (a.tickets + a.entries + a.trainings)),
      open,
    };
  }

  /** Ойда шу ҳолатга ўтган (ҳар бир мурожаат учун битта — охирги) ҳодисалар */
  private async eventsOf(status: 'resolved' | 'forwarded', r: { gte: Date; lt: Date }, mine: Prisma.JournalTicketWhereInput) {
    const rows = await this.prisma.journalTicketEvent.findMany({
      where: { status, at: r, ticket: mine }, orderBy: { at: 'asc' },
      include: { ticket: { select: { received: true, orgId: true } } },
    });
    return [...new Map(rows.map((e) => [e.ticketId, e])).values()];
  }
}
