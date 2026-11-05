import { Type } from 'class-transformer';
import {
  IsArray, IsDateString, IsEnum, IsIn, IsInt, IsNumber, IsOptional, IsString, IsUUID, Length, ValidateNested,
} from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';

export class EducationDto {
  @IsString() institutionName: string;
  @IsOptional() @IsString() speciality?: string;
  @IsOptional() @IsString() studyType?: string;
  @IsOptional() @IsInt() startYear?: number;
  @IsOptional() @IsInt() endYear?: number;
}
export class WorkHistoryDto {
  @IsOptional() @IsDateString() startDate?: string;
  @IsOptional() @IsDateString() endDate?: string;
  @IsString() organizationName: string;
  @IsOptional() @IsString() positionTitle?: string;
}
export class RelativeDto {
  @IsString() relativeType: string;
  @IsString() fullName: string;
  @IsOptional() @IsString() birthYearPlace?: string;
  @IsOptional() @IsString() workPlacePosition?: string;
  @IsOptional() @IsString() livingAddress?: string;
}

export class CreateEmployeeDto {
  @IsString() tabNumber: string;
  @IsString() firstName: string;
  @IsString() lastName: string;
  @IsOptional() @IsString() middleName?: string;
  @IsOptional() @IsDateString() birthDate?: string;
  @IsOptional() @IsString() birthPlace?: string;
  @IsOptional() @IsEnum(['erkak', 'ayol']) gender?: 'erkak' | 'ayol';
  @IsOptional() @IsString() nationality?: string;
  @IsOptional() @IsString() partyMembership?: string;
  @IsOptional() @IsString() educationLevel?: string;
  @IsOptional() @IsString() foreignLanguages?: string;
  @IsOptional() @IsString() academicDegree?: string;
  @IsOptional() @IsString() academicTitle?: string;
  @IsOptional() @IsString() militaryRank?: string;
  @IsOptional() @IsString() stateAwards?: string;
  @IsOptional() @IsString() deputyStatus?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() addressResidential?: string;
  @IsOptional() @IsString() @Length(14, 14) pinfl?: string;
  @IsOptional() @IsString() passportSeriesNumber?: string;
  @IsOptional() @IsDateString() passportGivenDate?: string;
  @IsOptional() @IsString() passportGivenBy?: string;
  @IsUUID() departmentId: string;
  @IsUUID() positionId: string;
  @IsOptional() @IsEnum(['shtat', 'gpx']) employmentType?: 'shtat' | 'gpx';
  @IsOptional() @IsDateString() hireDate?: string;
  @IsOptional() @IsString() contractNumber?: string;
  @IsOptional() @IsDateString() contractDate?: string;
  @IsOptional() @IsEnum(['muddatsiz', 'muddatli']) contractDurationType?: 'muddatsiz' | 'muddatli';
  @IsOptional() @IsInt() probationMonths?: number;
  @IsOptional() @IsNumber() salary?: number;
  @IsOptional() @IsInt() annualLeaveBasicDays?: number;
  @IsOptional() @IsInt() annualLeaveExtraDays?: number;
  @IsOptional() @IsEnum(['ishlamoqda', 'tatilda', 'ishdan_boshagan'])
  status?: 'ishlamoqda' | 'tatilda' | 'ishdan_boshagan';

  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => EducationDto)
  education?: EducationDto[];
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => WorkHistoryDto)
  workHistory?: WorkHistoryDto[];
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => RelativeDto)
  relatives?: RelativeDto[];
}
export class UpdateEmployeeDto extends PartialType(CreateEmployeeDto) {}

export class ListEmployeesQuery {
  @IsOptional() @IsString() q?: string;
  @IsOptional() @IsUUID() departmentId?: string;
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsString() archived?: string;
  @IsOptional() @IsString() sortBy?: string;
  @IsOptional() @IsIn(['asc', 'desc']) sortDir?: 'asc' | 'desc';
  @IsOptional() @Type(() => Number) @IsInt() page?: number;
  @IsOptional() @Type(() => Number) @IsInt() pageSize?: number;
}
