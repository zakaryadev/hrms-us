import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CalendarOverrides, DayKind, MOVABLE_HOLIDAYS, addDays, dayStatus, isBuiltinHoliday, isWeekend, pad, utcDate, ymd,
} from './holidays';

export const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

@Injectable()
export class CalendarService {
  constructor(private prisma: PrismaService) {}

  /** [fromYear, toYear] оралиғидаги қўлда белгиланган кунлар */
  async overrides(fromYear: number, toYear: number = fromYear): Promise<CalendarOverrides> {
    const rows = await this.prisma.calendarDay.findMany({
      where: { date: { gte: new Date(Date.UTC(fromYear, 0, 1)), lt: new Date(Date.UTC(toYear + 1, 0, 1)) } },
    });
    return Object.fromEntries(rows.map((r) => [ymd(r.date), r.kind as DayKind]));
  }

  /** Санадан (ва ундан кейинги `spanDays` кундан) ўтиши мумкин бўлган йилларни қамраб олади */
  overridesAround(startIso: string, spanDays = 120) {
    const a = utcDate(startIso).getUTCFullYear();
    const b = addDays(utcDate(startIso), spanDays).getUTCFullYear();
    return this.overrides(a, b);
  }

  /** Йил учун байрам санаси киритилганми (ўрнатилган жадвал ёки қўлда) */
  async isYearConfigured(year: number) {
    if (year in MOVABLE_HOLIDAYS) return true;
    return (await this.prisma.calendarDay.count({ where: { date: { gte: new Date(Date.UTC(year, 0, 1)), lt: new Date(Date.UTC(year + 1, 0, 1)) } } })) > 0;
  }

  async year(year: number) {
    if (!Number.isInteger(year) || year < 2000 || year > 2100) throw new BadRequestException('Йил 2000–2100 оралиғида бўлиши керак');
    const rows = await this.prisma.calendarDay.findMany({
      where: { date: { gte: new Date(Date.UTC(year, 0, 1)), lt: new Date(Date.UTC(year + 1, 0, 1)) } },
    });
    const custom = new Map(rows.map((r) => [ymd(r.date), r]));
    const ov = Object.fromEntries(rows.map((r) => [ymd(r.date), r.kind as DayKind])) as CalendarOverrides;
    const days: { date: string; status: string; builtin: boolean; custom: DayKind | null; note: string | null }[] = [];
    for (let d = utcDate(`${year}-01-01`); d.getUTCFullYear() === year; d = addDays(d, 1)) {
      const key = ymd(d);
      days.push({ date: key, status: dayStatus(d, ov), builtin: isBuiltinHoliday(d), custom: (custom.get(key)?.kind as DayKind) ?? null, note: custom.get(key)?.note ?? null });
    }
    return { year, configured: year in MOVABLE_HOLIDAYS || rows.length > 0, days };
  }

  async set(date: string, kind: DayKind, note?: string | null) {
    this.assertDate(date);
    const row = await this.prisma.calendarDay.upsert({
      where: { date: utcDate(date) }, update: { kind, note: note?.trim() || null }, create: { date: utcDate(date), kind, note: note?.trim() || null },
    });
    return { date, kind: row.kind, note: row.note };
  }

  async remove(date: string) {
    this.assertDate(date);
    await this.prisma.calendarDay.deleteMany({ where: { date: utcDate(date) } });
    return { ok: true };
  }

  private assertDate(date: string) {
    if (!ISO_DATE.test(date) || isNaN(utcDate(date).getTime()) || ymd(utcDate(date)) !== date) throw new BadRequestException('Сана ЙЙЙЙ-ОО-КК форматида бўлиши керак');
    const y = Number(date.slice(0, 4));
    if (y < 2000 || y > 2100) throw new BadRequestException('Йил 2000–2100 оралиғида бўлиши керак');
  }
}
