import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { PRIORITIES, Priority, TICKET_STATUSES, TicketStatus } from '../ticket.rules';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
const toBool = ({ value }: { value: unknown }) => (value === 'true' ? true : value === 'false' ? false : value);

export class CreateTicketDto {
  @Transform(trim)
  @IsString()
  @MinLength(3)
  @MaxLength(150)
  title!: string;

  @Transform(trim)
  @IsString()
  @MinLength(3)
  @MaxLength(5000)
  description!: string;

  @IsUUID()
  categoryId!: string;

  @IsOptional()
  @IsIn(PRIORITIES)
  priority?: Priority;

  @IsOptional()
  @IsUUID()
  assetId?: string;
}

export class UpdateTicketDto {
  @ValidateIf((o: UpdateTicketDto) => o.title !== undefined)
  @Transform(trim)
  @IsString()
  @MinLength(3)
  @MaxLength(150)
  title?: string;

  @ValidateIf((o: UpdateTicketDto) => o.categoryId !== undefined)
  @IsUUID()
  categoryId?: string;

  @ValidateIf((o: UpdateTicketDto) => o.priority !== undefined)
  @IsIn(PRIORITIES)
  priority?: Priority;

  // null remove o vínculo com o ativo.
  @IsOptional()
  @IsUUID()
  assetId?: string | null;
}

export class AssignTicketDto {
  @IsUUID()
  assigneeId!: string;
}

export class ChangeStatusDto {
  @IsIn(TICKET_STATUSES)
  status!: TicketStatus;
}

export class CreateCommentDto {
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  body!: string;

  @IsOptional()
  @IsBoolean()
  internal?: boolean;
}

export const SORTS = ['createdAt', '-createdAt', 'resolutionDueAt', '-resolutionDueAt', 'number', '-number'] as const;
export type TicketSort = (typeof SORTS)[number];

export class ListTicketsQuery {
  @IsOptional() @IsIn(TICKET_STATUSES) status?: TicketStatus;
  @IsOptional() @IsIn(PRIORITIES) priority?: Priority;
  @IsOptional() @IsUUID() categoryId?: string;
  @IsOptional() @IsUUID() assigneeId?: string;
  @IsOptional() @IsUUID() requesterId?: string;
  @IsOptional() @IsUUID() assetId?: string;
  @IsOptional() @IsDateString() from?: string;
  @IsOptional() @IsDateString() to?: string;

  @IsOptional()
  @Transform(toBool)
  @IsBoolean()
  slaBreached?: boolean;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  q?: string;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page: number = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) perPage: number = 20;
  @IsOptional() @IsIn(SORTS) sort: TicketSort = '-createdAt';
}
