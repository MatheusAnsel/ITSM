import { Body, Controller, Get, HttpCode, Patch, Post, Req, Res } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { CookieOptions, Request, Response } from 'express';
import { AuthUser, CurrentUser, Public } from '../../common/decorators/auth.decorators';
import { validateEnv } from '../../config/env';
import { AuthService, Session } from './auth.service';
import { ChangePasswordDto, LoginDto, RegisterDto } from './dto/auth.dto';
import { Audit, fromResult } from '../audit/audit.decorator';

// E-mail informado no login, normalizado e limitado, para rastrear tentativas; a senha nunca entra.
function loginEmail(body: unknown): Record<string, unknown> {
  const email = (body as { email?: unknown } | undefined)?.email;
  return typeof email === 'string' ? { email: email.trim().toLowerCase().slice(0, 254) } : {};
}

export const REFRESH_COOKIE = 'itsm_refresh';
const COOKIE_PATH = '/api/auth';

@Controller('auth')
export class AuthController {
  private readonly secure = validateEnv().COOKIE_SECURE;

  constructor(private readonly auth: AuthService) {}

  @Public()
  @Audit({
    action: 'USER_REGISTERED',
    entity: 'User',
    actorId: fromResult('user.id'),
    entityId: fromResult('user.id'),
  })
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('register')
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    return this.respond(res, await this.auth.register(dto));
  }

  @Public()
  @Audit({
    action: 'LOGIN_SUCCEEDED',
    failureAction: 'LOGIN_FAILED',
    entity: 'User',
    actorId: fromResult('user.id'),
    entityId: fromResult('user.id'),
    extra: (req) => loginEmail(req.body),
  })
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(200)
  @Post('login')
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    return this.respond(res, await this.auth.login(dto));
  }

  @Public()
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @HttpCode(200)
  @Post('refresh')
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = (req.cookies as Record<string, string> | undefined)?.[REFRESH_COOKIE];
    return this.respond(res, await this.auth.refresh(token));
  }

  @Audit({ action: 'LOGOUT', entity: 'User', entityId: (req) => req.user?.id })
  @HttpCode(204)
  @Post('logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<void> {
    const token = (req.cookies as Record<string, string> | undefined)?.[REFRESH_COOKIE];
    await this.auth.logout(token);
    res.clearCookie(REFRESH_COOKIE, this.cookieOptions());
  }

  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return this.auth.me(user.id);
  }

  @Audit({ action: 'PASSWORD_CHANGED', entity: 'User', entityId: (req) => req.user?.id })
  @HttpCode(204)
  @Patch('me/password')
  async changePassword(
    @CurrentUser() user: AuthUser,
    @Body() dto: ChangePasswordDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    await this.auth.changePassword(user.id, dto);
    res.clearCookie(REFRESH_COOKIE, this.cookieOptions());
  }

  private respond(res: Response, session: Session) {
    res.cookie(REFRESH_COOKIE, session.refreshToken, {
      ...this.cookieOptions(),
      expires: session.refreshExpiresAt,
    });
    return { accessToken: session.accessToken, user: session.user };
  }

  private cookieOptions(): CookieOptions {
    return { httpOnly: true, secure: this.secure, sameSite: 'strict', path: COOKIE_PATH };
  }
}
