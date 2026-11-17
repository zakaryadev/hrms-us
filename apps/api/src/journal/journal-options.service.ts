import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { JournalOptionKind, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { OPTION_KINDS } from './journal.constants';
import type { OptionDto, OptionUpdateDto } from './journal.dto';
import { optionRef } from './journal.util';

const USAGE = {
  orgs: true, ticketsByCategory: true, ticketsByChannel: true, ticketsByPriority: true, entriesByType: true,
  entriesByChannel: true, trainingsByFormat: true, kbByCategory: true, kbByType: true,
} as const;

/** Журналнинг очиладиган рўйхатлари (иш тури, канал, устуворлик…): ёзувлар id орқали боғланади. */
@Injectable()
export class JournalOptionsService {
  constructor(private prisma: PrismaService) {}

  /** Барча рўйхатлар, тур бўйича. `usage` — неча ёзув ишлатаётгани (ўчириш мумкинми — шундан). */
  async listAll() {
    const rows = await this.prisma.journalOption.findMany({
      orderBy: [{ sort: 'asc' }, { labelLat: 'asc' }],
      include: { _count: { select: USAGE } },
    });
    const out = Object.fromEntries(OPTION_KINDS.map((k) => [k, [] as unknown[]])) as Record<JournalOptionKind, unknown[]>;
    for (const { _count, ...o } of rows) {
      out[o.kind].push({
        ...optionRef(o), customCyr: o.labelCyr, sort: o.sort, active: o.active,
        usage: Object.values(_count).reduce((s, n) => s + n, 0),
      });
    }
    return out;
  }

  async create(dto: OptionDto) {
    const last = await this.prisma.journalOption.aggregate({ where: { kind: dto.kind }, _max: { sort: true } });
    const o = await this.prisma.journalOption.create({
      data: { kind: dto.kind, labelLat: dto.labelLat.trim(), labelCyr: dto.labelCyr?.trim() || null, sort: (last._max.sort ?? 0) + 10 },
    });
    return optionRef(o);
  }

  async update(id: string, dto: OptionUpdateDto) {
    const data: Prisma.JournalOptionUpdateInput = {};
    if (dto.labelLat !== undefined) data.labelLat = dto.labelLat.trim();
    if (dto.labelCyr !== undefined) data.labelCyr = dto.labelCyr?.trim() || null;
    if (dto.active !== undefined) data.active = dto.active;
    return optionRef(await this.prisma.journalOption.update({ where: { id }, data }));
  }

  /** Ишлатилаётган элементни ўчириб бўлмайди (ёзувлар «бўш» бўлиб қолмаслиги учун) — яшириш (active=false) керак. */
  async remove(id: string) {
    const o = await this.prisma.journalOption.findUnique({ where: { id }, include: { _count: { select: USAGE } } });
    if (!o) throw new NotFoundException('Рўйхат элементи топилмади');
    const usage = Object.values(o._count).reduce((s, n) => s + n, 0);
    if (usage > 0) throw new ConflictException(`Бу элемент ${usage} та ёзувда ишлатилган — ўчириш ўрнига яширинг`);
    await this.prisma.journalOption.delete({ where: { id } });
  }

  /** Тартиб: ids рўйхатидаги кетма-кетлик бўйича sort қайта ёзилади. */
  async reorder(kind: JournalOptionKind, ids: string[]) {
    const found = await this.prisma.journalOption.findMany({ where: { kind, id: { in: ids } }, select: { id: true } });
    if (found.length !== new Set(ids).size) throw new BadRequestException('Рўйхат элементлари топилмади');
    await this.prisma.$transaction(ids.map((id, i) => this.prisma.journalOption.update({ where: { id }, data: { sort: (i + 1) * 10 } })));
  }

  /** Ёзувга берилган id лар кўрсатилган турдаги элементларга тегишлими (масалан, «канал» ўрнига «категория» юборилмаганми). */
  async assertKinds(checks: Array<[string | null | undefined, JournalOptionKind]>) {
    const wanted = checks.filter((c): c is [string, JournalOptionKind] => !!c[0]);
    if (!wanted.length) return;
    const rows = await this.prisma.journalOption.findMany({ where: { id: { in: wanted.map((w) => w[0]) } }, select: { id: true, kind: true } });
    const kindOf = new Map(rows.map((r) => [r.id, r.kind]));
    for (const [id, kind] of wanted) if (kindOf.get(id) !== kind) throw new BadRequestException('Рўйхат элементи нотўғри');
  }
}
