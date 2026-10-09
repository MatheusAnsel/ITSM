import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { AuthUser, CurrentUser, Roles } from '../../common/decorators/auth.decorators';
import {
  AssignTicketDto,
  ChangeStatusDto,
  CreateCommentDto,
  CreateTicketDto,
  ListTicketsQuery,
  UpdateTicketDto,
} from './dto/tickets.dto';
import { TicketsService } from './tickets.service';
import { Audit, fromParam, fromResult } from '../audit/audit.decorator';
import { pickFields } from '../audit/audit.rules';

@Controller('tickets')
export class TicketsController {
  constructor(private readonly tickets: TicketsService) {}

  @Audit({ action: 'TICKET_CREATED', entity: 'Ticket', entityId: fromResult() })
  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateTicketDto) {
    return this.tickets.create(user, dto);
  }

  @Get()
  list(@CurrentUser() user: AuthUser, @Query() query: ListTicketsQuery) {
    return this.tickets.list(user, query);
  }

  @Get(':id')
  get(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.tickets.get(user, id);
  }

  @Roles('AGENT', 'MANAGER', 'ADMIN')
  @Audit({
    action: 'TICKET_UPDATED',
    entity: 'Ticket',
    entityId: fromParam(),
    extra: (req) => pickFields(req.body, ['priority', 'categoryId', 'assetId']),
  })
  @Patch(':id')
  update(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateTicketDto) {
    return this.tickets.update(user, id, dto);
  }

  @Roles('AGENT', 'MANAGER', 'ADMIN')
  @Audit({
    action: 'TICKET_ASSIGNED',
    entity: 'Ticket',
    entityId: fromParam(),
    extra: (req) => pickFields(req.body, ['assigneeId']),
  })
  @HttpCode(200)
  @Post(':id/assign')
  assign(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: AssignTicketDto) {
    return this.tickets.assign(user, id, dto.assigneeId);
  }

  @Audit({
    action: 'TICKET_STATUS_CHANGED',
    entity: 'Ticket',
    entityId: fromParam(),
    extra: (req) => pickFields(req.body, ['status']),
  })
  @HttpCode(200)
  @Post(':id/status')
  changeStatus(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: ChangeStatusDto) {
    return this.tickets.changeStatus(user, id, dto.status);
  }

  @Get(':id/comments')
  comments(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.tickets.listComments(user, id);
  }

  @Post(':id/comments')
  addComment(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: CreateCommentDto) {
    return this.tickets.addComment(user, id, dto);
  }

  @Get(':id/history')
  history(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.tickets.listHistory(user, id);
  }
}
