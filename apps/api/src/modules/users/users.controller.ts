import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { AuthUser, CurrentUser, Roles } from '../../common/decorators/auth.decorators';
import { CreateUserDto, ListUsersQuery, UpdateUserDto } from './dto/users.dto';
import { UsersService } from './users.service';
import { Audit, fromParam, fromResult } from '../audit/audit.decorator';
import { pickFields } from '../audit/audit.rules';

@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  // Declarada antes de ':id' para não ser capturada pela rota dinâmica.
  @Roles('AGENT', 'MANAGER', 'ADMIN')
  @Get('agents')
  agents() {
    return this.users.agents();
  }

  @Roles('ADMIN')
  @Get()
  list(@Query() query: ListUsersQuery) {
    return this.users.list(query);
  }

  @Roles('ADMIN')
  @Audit({
    action: 'USER_CREATED',
    entity: 'User',
    entityId: fromResult(),
    extra: (req) => pickFields(req.body, ['role']),
  })
  @Post()
  create(@Body() dto: CreateUserDto) {
    return this.users.create(dto);
  }

  @Roles('ADMIN')
  @Get(':id')
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.users.get(id);
  }

  @Roles('ADMIN')
  @Audit({
    action: 'USER_UPDATED',
    entity: 'User',
    entityId: fromParam(),
    extra: (req) => pickFields(req.body, ['role', 'active']),
  })
  @Patch(':id')
  update(
    @CurrentUser() actor: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.users.update(actor.id, id, dto);
  }
}
