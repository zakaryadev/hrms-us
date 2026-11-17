import { JournalOptionKind, KbStatus, TicketStatus } from '@prisma/client';
import { Transform } from 'class-transformer';
import { ArrayNotEmpty, IsArray, IsBoolean, IsEnum, IsInt, IsOptional, IsString, IsUUID, Length, Matches, Min } from 'class-validator';

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE_MSG = 'сана YYYY-MM-DD кўринишида бўлиши керак';
const TIME_MSG = 'вақт HH:mm кўринишида бўлиши керак';
/** Бўш қатор → undefined / null (ихтиёрий майдонлар учун) */
const emptyToUndef = () => Transform(({ value }) => (value === '' ? undefined : value));
const emptyToNull = () => Transform(({ value }) => (value === '' ? null : value));

/* ───── Рўйхатлар ───── */
export class OptionDto {
  @IsEnum(JournalOptionKind) kind: JournalOptionKind;
  @IsString() @Length(1, 200) labelLat: string;
  @IsOptional() @emptyToUndef() @IsString() @Length(1, 200) labelCyr?: string;
}
export class OptionUpdateDto {
  @IsOptional() @IsString() @Length(1, 200) labelLat?: string;
  @IsOptional() @emptyToNull() @IsString() @Length(1, 200) labelCyr?: string | null;
  @IsOptional() @IsBoolean() active?: boolean;
}
export class OptionReorderDto {
  @IsEnum(JournalOptionKind) kind: JournalOptionKind;
  @IsArray() @ArrayNotEmpty() @IsUUID(undefined, { each: true }) ids: string[];
}
export class SettingsDto { @IsInt() @Min(0) normDays: number }

/* ───── Ташкилотлар ───── */
export class OrgDto {
  @IsString() @Length(1, 300) name: string;
  @IsOptional() @IsString() @Length(0, 200) region?: string;
  @IsOptional() @emptyToNull() @IsUUID() groupId?: string | null;
  @IsOptional() @IsString() @Length(0, 1000) note?: string;
}
export class MergeOrgDto { @IsUUID() intoId: string }

/* ───── Мурожаатлар ───── */
export class TicketDto {
  /** Бўш қолса автоматик берилади (M-2026-0001) */
  @IsOptional() @emptyToUndef() @IsString() @Length(1, 50) code?: string;
  @Matches(DATE, { message: DATE_MSG }) received: string;
  @IsOptional() @emptyToNull() @IsUUID() orgId?: string | null;
  @IsOptional() @IsString() @Length(0, 300) person?: string;
  @IsOptional() @emptyToNull() @IsUUID() channelId?: string | null;
  @IsOptional() @emptyToNull() @IsUUID() categoryId?: string | null;
  @IsOptional() @emptyToNull() @IsUUID() priorityId?: string | null;
  @IsString() @Length(1, 5000) problem: string;
  @IsOptional() @IsString() @Length(0, 5000) actions?: string;
  @IsOptional() @IsString() @Length(0, 300) dept?: string;
  @IsOptional() @IsString() @Length(0, 1000) note?: string;
}
export class TicketStatusDto {
  @IsEnum(TicketStatus) status: TicketStatus;
  /** Ҳал этилган сана (ортга сана билан белгилаш мумкин). Бўш — бугун. */
  @IsOptional() @emptyToUndef() @Matches(DATE, { message: DATE_MSG }) date?: string;
  @IsOptional() @IsString() @Length(0, 1000) note?: string;
}

/* ───── Кундалик ишлар ───── */
export class EntryDto {
  @Matches(DATE, { message: DATE_MSG }) date: string;
  @IsOptional() @emptyToUndef() @Matches(TIME, { message: TIME_MSG }) start?: string;
  @IsOptional() @emptyToUndef() @Matches(TIME, { message: TIME_MSG }) end?: string;
  @IsOptional() @emptyToNull() @IsUUID() typeId?: string | null;
  @IsOptional() @emptyToNull() @IsUUID() orgId?: string | null;
  @IsOptional() @emptyToNull() @IsUUID() ticketId?: string | null;
  @IsOptional() @IsString() @Length(0, 300) person?: string;
  @IsOptional() @emptyToNull() @IsUUID() channelId?: string | null;
  @IsString() @Length(1, 5000) done: string;
  @IsOptional() @IsString() @Length(0, 5000) result?: string;
}

/* ───── Ўқитиш ───── */
export class TrainingDto {
  @Matches(DATE, { message: DATE_MSG }) date: string;
  @IsOptional() @emptyToNull() @IsUUID() orgId?: string | null;
  @IsString() @Length(1, 500) topic: string;
  @IsOptional() @emptyToNull() @IsUUID() formatId?: string | null;
  @IsInt() @Min(0) count: number;
  @IsOptional() @emptyToNull() @IsUUID() ticketId?: string | null;
  @IsOptional() @IsString() @Length(0, 500) link?: string;
  @IsOptional() @IsString() @Length(0, 300) trainer?: string;
  @IsOptional() @IsString() @Length(0, 5000) result?: string;
  @IsOptional() @IsString() @Length(0, 1000) note?: string;
}

/* ───── Билимлар базаси ───── */
export class KbDto {
  @IsOptional() @emptyToUndef() @IsString() @Length(1, 50) code?: string;
  @Matches(DATE, { message: DATE_MSG }) created: string;
  @IsOptional() @emptyToNull() @IsUUID() categoryId?: string | null;
  @IsOptional() @emptyToNull() @IsUUID() typeId?: string | null;
  @IsString() @Length(1, 5000) question: string;
  @IsOptional() @IsString() @Length(0, 10000) solution?: string;
  @IsOptional() @emptyToNull() @IsUUID() ticketId?: string | null;
  @IsOptional() @IsString() @Length(0, 500) link?: string;
  @IsOptional() @IsString() @Length(0, 30) version?: string;
  @IsOptional() @IsEnum(KbStatus) status?: KbStatus;
  @IsOptional() @emptyToNull() @Matches(DATE, { message: DATE_MSG }) review?: string | null;
}
