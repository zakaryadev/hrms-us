import { IsInt, IsNumber, IsOptional, IsString, IsUUID, Length, Min } from 'class-validator';

export class CreatePositionDto {
  @IsString() @Length(1, 200) title: string;
  @IsUUID() departmentId: string;
  @IsOptional() @IsInt() rankOrder?: number;
  @IsOptional() @IsNumber() @Min(0) baseSalary?: number;
  @IsOptional() @IsInt() @Min(1) staffCount?: number;
}
export class UpdatePositionDto {
  @IsOptional() @IsString() @Length(1, 200) title?: string;
  @IsOptional() @IsUUID() departmentId?: string;
  @IsOptional() @IsInt() rankOrder?: number;
  @IsOptional() @IsNumber() @Min(0) baseSalary?: number;
  @IsOptional() @IsInt() @Min(1) staffCount?: number;
}
