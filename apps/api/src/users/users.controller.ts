import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { IsBoolean, IsEnum, IsOptional, IsString, Length, Matches } from 'class-validator';
import { Roles } from '../auth/decorators';
import { UsersService } from './users.service';

class CreateUserDto {
  @IsString() @Length(2, 64) @Matches(/^[a-zA-Z0-9._-]+$/, { message: 'login' }) login: string;
  @IsString() @Length(2, 120) fullName: string;
  @IsEnum(UserRole) role: UserRole;
  @IsString() @Length(1, 128) password: string;
}
class UpdateUserDto {
  @IsOptional() @IsString() @Length(2, 120) fullName?: string;
  @IsOptional() @IsEnum(UserRole) role?: UserRole;
  @IsOptional() @IsBoolean() active?: boolean;
  @IsOptional() @IsString() @Length(1, 128) password?: string;
}

@Roles('superadmin')
@Controller('users')
export class UsersController {
  constructor(private svc: UsersService) {}
  @Get() list() { return this.svc.list(); }
  @Post() create(@Body() dto: CreateUserDto) { return this.svc.create(dto); }
  @Patch(':id') update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateUserDto) { return this.svc.update(id, dto); }
}
