import { Module } from '@nestjs/common';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { validateEnv } from '../../config/env';
import { AuthController } from './auth.controller';
import { AuthRepository, PrismaAuthRepository } from './auth.repository';
import { AUTH_OPTIONS, AuthOptions, AuthService } from './auth.service';

const env = validateEnv();

@Module({
  imports: [
    JwtModule.register({
      global: true,
      secret: env.JWT_ACCESS_SECRET,
      signOptions: { expiresIn: env.JWT_ACCESS_TTL as never, algorithm: 'HS256' },
      verifyOptions: { algorithms: ['HS256'] },
    }),
  ],
  controllers: [AuthController],
  providers: [
    { provide: AuthRepository, useClass: PrismaAuthRepository },
    { provide: AUTH_OPTIONS, useValue: { refreshTtlDays: env.REFRESH_TTL_DAYS } satisfies AuthOptions },
    {
      provide: AuthService,
      useFactory: (repo: AuthRepository, jwt: JwtService, opts: AuthOptions) =>
        new AuthService(repo, jwt, opts),
      inject: [AuthRepository, JwtService, AUTH_OPTIONS],
    },
  ],
  exports: [AuthService],
})
export class AuthModule {}
