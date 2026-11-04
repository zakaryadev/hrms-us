import { IsInt, IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreatePositionDto {
  @IsString() title: string;
  @IsUUID() departmentId: string;
  @IsOptional() @IsInt() rankOrder?: number;
  @IsOptional() @IsNumber() baseSalary?: number;
  @IsOptional() @IsInt() staffCount?: number;
}
export class UpdatePositionDto {
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsUUID() departmentId?: string;
  @IsOptional() @IsInt() rankOrder?: number;
  @IsOptional() @IsNumber() baseSalary?: number;
  @IsOptional() @IsInt() staffCount?: number;
}
