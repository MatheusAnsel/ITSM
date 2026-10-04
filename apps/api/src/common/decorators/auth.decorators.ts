import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import type { RoleName } from '../roles';

export const IS_PUBLIC_KEY = 'isPublic';
export const ROLES_KEY = 'roles';

export interface AuthUser {
  id: string;
  role: RoleName;
}

// Rotas são protegidas por padrão (guard global); @Public libera.
export const Public = (): MethodDecorator & ClassDecorator => SetMetadata(IS_PUBLIC_KEY, true);
export const Roles = (...roles: RoleName[]): MethodDecorator & ClassDecorator =>
  SetMetadata(ROLES_KEY, roles);

export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): AuthUser => {
  return ctx.switchToHttp().getRequest<{ user: AuthUser }>().user;
});
