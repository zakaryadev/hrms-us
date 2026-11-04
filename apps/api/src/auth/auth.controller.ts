import { Body, Controller, Get, HttpCode, Post, Req, Res } from '@nestjs/common';
import { IsString, Length, Matches } from 'class-validator';
import type { Request, Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { COOKIE_NAME, cookieOptions } from './auth.constants';
import { AuthService } from './auth.service';
import { AuthUser, CurrentUser, Public } from './decorators';

class LoginDto {
  @IsString() @Length(1, 64) login: string;
  @IsString() @Length(1, 128) password: string;
}
class SetupDto {
  @IsString() @Length(2, 64) @Matches(/^[a-zA-Z0-9._-]+$/, { message: 'login' }) login: string;
  @IsString() @Length(1, 128) password: string;
  @IsString() @Length(2, 120) fullName: string;
}
class ChangePasswordDto {
  @IsString() @Length(1, 128) oldPassword: string;
  @IsString() @Length(1, 128) newPassword: string;
}

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService, private prisma: PrismaService) {}

  @Public() @Get('setup-status')
  async status() { return { needsSetup: await this.auth.needsSetup() }; }

  @Public() @Post('setup')
  async setup(@Body() dto: SetupDto, @Res({ passthrough: true }) res: Response) {
    const user = await this.auth.setup(dto);
    res.cookie(COOKIE_NAME, await this.auth.sign(user), cookieOptions());
    return { id: user.id, login: user.login, fullName: user.fullName, role: user.role };
  }

  @Public() @Post('login') @HttpCode(200)
  async login(@Body() dto: LoginDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const user = await this.auth.login(dto.login, dto.password, req.ip ?? 'unknown');
    res.cookie(COOKIE_NAME, await this.auth.sign(user), cookieOptions());
    return { id: user.id, login: user.login, fullName: user.fullName, role: user.role };
  }

  @Public() @Post('logout') @HttpCode(200)
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(COOKIE_NAME, { ...cookieOptions(), maxAge: undefined });
    return { ok: true };
  }

  @Get('me')
  me(@CurrentUser() user: AuthUser) { return user; }

  @Post('change-password') @HttpCode(200)
  async changePassword(@CurrentUser() user: AuthUser, @Body() dto: ChangePasswordDto) {
    await this.auth.changePassword(user.id, dto.oldPassword, dto.newPassword);
    return { ok: true };
  }
}
