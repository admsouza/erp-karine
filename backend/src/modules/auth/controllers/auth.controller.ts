import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req, Res } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { Public } from '../../../common/decorators/public.decorator.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import { AuthService } from '../services/auth.service.js';
import { SESSION_COOKIE } from '../services/session.service.js';
import { LoginDto } from '../dto/login.dto.js';
import { ChangePasswordDto } from '../dto/change-password.dto.js';
import { AuthUserDto } from '../dto/auth-user.dto.js';
import { clearSessionCookie, setSessionCookie } from '../http/session-cookie.js';
import type { AuthenticatedUser } from '../entities/authenticated-user.entity.js';

@ApiTags('auth')
@ApiCookieAuth(SESSION_COOKIE)
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Autentica e abre a sessão (cookie httpOnly)' })
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ user: AuthUserDto }> {
    const { user, token, expiresAt } = await this.auth.login(dto, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
    setSessionCookie(res, token, expiresAt);
    return { user: AuthUserDto.from(user) };
  }

  @Get('me')
  @ApiOperation({ summary: 'Usuário da sessão atual' })
  async me(@CurrentUser() user: AuthenticatedUser): Promise<{ user: AuthUserDto }> {
    return { user: AuthUserDto.from(await this.auth.me(user)) };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Encerra a sessão atual' })
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ ok: true }> {
    await this.auth.logout(req.cookies?.[SESSION_COOKIE]);
    clearSessionCookie(res);
    return { ok: true };
  }

  @Post('password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Troca a própria senha e encerra as outras sessões' })
  async changePassword(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ChangePasswordDto,
  ): Promise<{ ok: true; revokedOthers: number }> {
    const { revokedOthers } = await this.auth.changePassword(user, dto.currentPassword, dto.newPassword);
    return { ok: true, revokedOthers };
  }
}
