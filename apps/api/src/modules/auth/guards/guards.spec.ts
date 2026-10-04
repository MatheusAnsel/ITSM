import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { IS_PUBLIC_KEY, ROLES_KEY } from '../../../common/decorators/auth.decorators';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RolesGuard } from './roles.guard';

function ctx(req: object): ExecutionContext {
  return {
    getHandler: () => ctx,
    getClass: () => ctx,
    switchToHttp: () => ({ getRequest: () => req }),
  } as unknown as ExecutionContext;
}

describe('JwtAuthGuard', () => {
  const jwt = new JwtService({ secret: 'x'.repeat(32), signOptions: { expiresIn: '15m' } });
  const reflector = new Reflector();
  const guard = new JwtAuthGuard(jwt, reflector);

  it('libera rotas públicas', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValueOnce(true);
    await expect(guard.canActivate(ctx({ headers: {} }))).resolves.toBe(true);
  });

  it('recusa sem token, com esquema errado ou token inválido', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    for (const authorization of [undefined, 'Basic abc', 'Bearer lixo']) {
      await expect(guard.canActivate(ctx({ headers: { authorization } }))).rejects.toBeInstanceOf(UnauthorizedException);
    }
  });

  it('aceita token válido e preenche req.user', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    const token = await jwt.signAsync({ sub: 'u1', role: 'AGENT' });
    const req: { headers: object; user?: unknown } = { headers: { authorization: `Bearer ${token}` } };
    await expect(guard.canActivate(ctx(req))).resolves.toBe(true);
    expect(req.user).toEqual({ id: 'u1', role: 'AGENT' });
  });

  it('recusa token com perfil desconhecido', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    const token = await jwt.signAsync({ sub: 'u1', role: 'ROOT' });
    await expect(guard.canActivate(ctx({ headers: { authorization: `Bearer ${token}` } }))).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('usa as chaves de metadata esperadas', () => {
    expect(IS_PUBLIC_KEY).toBe('isPublic');
    expect(ROLES_KEY).toBe('roles');
  });
});

describe('RolesGuard', () => {
  const reflector = new Reflector();
  const guard = new RolesGuard(reflector);

  it('sem @Roles, qualquer autenticado passa', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValueOnce(undefined);
    expect(guard.canActivate(ctx({ user: { id: 'u', role: 'REQUESTER' } }))).toBe(true);
  });

  it('bloqueia perfil fora da lista e libera o permitido', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['ADMIN']);
    expect(() => guard.canActivate(ctx({ user: { id: 'u', role: 'AGENT' } }))).toThrow(ForbiddenException);
    expect(guard.canActivate(ctx({ user: { id: 'u', role: 'ADMIN' } }))).toBe(true);
  });
});
