import { Transform } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, IsUUID, Length, Matches, Min } from 'class-validator';

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE_MSG = 'сана YYYY-MM-DD кўринишида бўлиши керак';
/** Бўш қатор → undefined (ихтиёрий майдонлар учун) */
const emptyToUndef = () => Transform(({ value }) => (value === '' ? undefined : value));
const emptyToNull = () => Transform(({ value }) => (value === '' ? null : value));

export class OrgDto {
  @IsString() @Length(1, 300) name: string;
  @IsOptional() @IsString() @Length(0, 200) region?: string;
  @IsOptional() @IsString() @Length(0, 50) group?: string;
  @IsOptional() @IsString() @Length(0, 1000) note?: string;
}
export class OrgUpdateDto {
  @IsOptional() @IsString() @Length(1, 300) name?: string;
  @IsOptional() @IsString() @Length(0, 200) region?: string;
  @IsOptional() @IsString() @Length(0, 50) group?: string;
  @IsOptional() @IsString() @Length(0, 1000) note?: string;
}
export class MergeOrgDto { @IsUUID() intoId: string; }

export class TicketDto {
  /** Бўш қолса автоматик берилади (M-2026-0001) */
  @IsOptional() @emptyToUndef() @IsString() @Length(1, 50) code?: string;
  @Matches(DATE, { message: DATE_MSG }) received: string;
  @IsOptional() @emptyToNull() @IsUUID() orgId?: string | null;
  @IsOptional() @IsString() @Length(0, 50) group?: string;
  @IsOptional() @IsString() @Length(0, 300) person?: string;
  @IsOptional() @IsString() @Length(0, 100) channel?: string;
  @IsOptional() @IsString() @Length(0, 100) category?: string;
  @IsOptional() @IsString() @Length(0, 50) priority?: string;
  @IsString() @Length(1, 5000) problem: string;
  @IsOptional() @IsString() @Length(0, 5000) actions?: string;
  @IsOptional() @IsString() @Length(0, 300) dept?: string;
  @IsOptional() @IsString() @Length(0, 100) status?: string;
  @IsOptional() @emptyToNull() @Matches(DATE, { message: DATE_MSG }) resolved?: string | null;
  @IsOptional() @IsBoolean() replied?: boolean | null;
  @IsOptional() @IsString() @Length(0, 1000) note?: string;
}

export class EntryDto {
  @Matches(DATE, { message: DATE_MSG }) date: string;
  @IsOptional() @emptyToUndef() @Matches(TIME, { message: 'вақт HH:mm кўринишида бўлиши керак' }) start?: string;
  @IsOptional() @emptyToUndef() @Matches(TIME, { message: 'вақт HH:mm кўринишида бўлиши керак' }) end?: string;
  @IsString() @Length(1, 100) type: string;
  @IsOptional() @emptyToNull() @IsUUID() orgId?: string | null;
  @IsOptional() @emptyToNull() @IsUUID() ticketId?: string | null;
  @IsOptional() @IsString() @Length(0, 300) person?: string;
  @IsOptional() @IsString() @Length(0, 100) channel?: string;
  @IsOptional() @IsString() @Length(0, 5000) content?: string;
  @IsOptional() @IsString() @Length(0, 5000) done?: string;
  @IsOptional() @IsString() @Length(0, 5000) result?: string;
  @IsOptional() @IsString() @Length(0, 100) status?: string;
  @IsOptional() @IsString() @Length(0, 500) next?: string;
  @IsOptional() @IsString() @Length(0, 300) partner?: string;
  @IsOptional() @IsString() @Length(0, 1000) note?: string;
}

export class TrainingDto {
  @Matches(DATE, { message: DATE_MSG }) date: string;
  @IsOptional() @emptyToNull() @IsUUID() orgId?: string | null;
  @IsString() @Length(1, 500) topic: string;
  @IsOptional() @IsString() @Length(0, 100) format?: string;
  @IsInt() @Min(0) count: number;
  @IsOptional() @emptyToNull() @IsUUID() ticketId?: string | null;
  @IsOptional() @IsString() @Length(0, 500) link?: string;
  @IsOptional() @IsString() @Length(0, 300) trainer?: string;
  @IsOptional() @IsString() @Length(0, 5000) result?: string;
  @IsOptional() @IsString() @Length(0, 1000) note?: string;
}

export class KbDto {
  @IsOptional() @emptyToUndef() @IsString() @Length(1, 50) code?: string;
  @Matches(DATE, { message: DATE_MSG }) created: string;
  @IsOptional() @IsString() @Length(0, 100) category?: string;
  @IsOptional() @IsString() @Length(0, 100) type?: string;
  @IsString() @Length(1, 5000) question: string;
  @IsOptional() @IsString() @Length(0, 10000) solution?: string;
  @IsOptional() @emptyToNull() @IsUUID() ticketId?: string | null;
  @IsOptional() @IsString() @Length(0, 500) link?: string;
  @IsOptional() @IsString() @Length(0, 30) version?: string;
  @IsOptional() @IsString() @Length(0, 100) status?: string;
  @IsOptional() @emptyToNull() @Matches(DATE, { message: DATE_MSG }) review?: string | null;
}

export class JournalSettingsDto {
  @IsOptional() @IsInt() @Min(0) normDays?: number;
  /** {workTypes: [...], statuses: [...], ...} — ichki tekshiruv servisda */
  @IsOptional() lists?: Record<string, string[]>;
}
