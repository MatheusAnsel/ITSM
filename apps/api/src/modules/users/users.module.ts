import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { PrismaUsersRepository, UsersRepository } from './users.repository';
import { UsersService } from './users.service';

@Module({
  controllers: [UsersController],
  providers: [
    { provide: UsersRepository, useClass: PrismaUsersRepository },
    {
      provide: UsersService,
      useFactory: (repo: UsersRepository) => new UsersService(repo),
      inject: [UsersRepository],
    },
  ],
  exports: [UsersService],
})
export class UsersModule {}
