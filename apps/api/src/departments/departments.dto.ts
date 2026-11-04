import { IsOptional, IsString, IsUUID, Length } from 'class-validator';

export class CreateDepartmentDto {
  @IsString() @Length(1, 200) name: string;
  @IsOptional() @IsString() @Length(0, 50) code?: string;
  @IsOptional() @IsUUID() parentId?: string;
}
export class UpdateDepartmentDto {
  @IsOptional() @IsString() @Length(1, 200) name?: string;
  @IsOptional() @IsString() @Length(0, 50) code?: string;
  /** null — юқори бўлимдан чиқариш */
  @IsOptional() @IsUUID() parentId?: string | null;
}
