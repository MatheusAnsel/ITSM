import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';
import { MAX_SLA_MINUTES } from '../sla.rules';

export class UpdateSlaPolicyDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_SLA_MINUTES)
  firstResponseMinutes!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_SLA_MINUTES)
  resolutionMinutes!: number;
}
