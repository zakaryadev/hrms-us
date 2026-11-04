import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export const SETTING_DEFAULTS = {
  tashkilot_nomi: 'Tashkilot nomi',
  bosh_direktor_fish: 'Bosh direktor F.I.Sh.',
  shahar: 'Toshkent',
  vakil_fish: 'Vakil F.I.Sh.',
  ishonchnoma_matni: 'ishonchnoma raqami va sanasi',
  ish_beruvchi_rekvizitlari: 'Manzil, STIR, h/r, bank, MFO',
} as const;
export type SettingKey = keyof typeof SETTING_DEFAULTS;
export const SETTING_KEYS = Object.keys(SETTING_DEFAULTS) as SettingKey[];

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  async getAll(): Promise<Record<SettingKey, string>> {
    const rows = await this.prisma.setting.findMany();
    const out: Record<string, string> = { ...SETTING_DEFAULTS };
    for (const r of rows) if (r.key in out) out[r.key] = r.value;
    return out as Record<SettingKey, string>;
  }

  async update(values: Record<string, unknown>) {
    for (const key of SETTING_KEYS) {
      const v = values[key];
      if (typeof v === 'string') {
        await this.prisma.setting.upsert({ where: { key }, update: { value: v }, create: { key, value: v } });
      }
    }
    return this.getAll();
  }
}
