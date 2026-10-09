import { Transform, Type } from 'class-transformer';
import {
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
import { ASSET_STATUSES, ASSET_TYPES, AssetStatusName, AssetTypeName } from '../assets.rules';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class CreateAssetDto {
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(40)
  tag!: string;

  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @IsIn(ASSET_TYPES)
  type!: AssetTypeName;

  @IsOptional()
  @IsIn(ASSET_STATUSES)
  status?: AssetStatusName;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(120)
  serialNumber?: string;

  @IsOptional()
  @IsDateString({ strict: true })
  purchaseDate?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @IsOptional()
  @IsUUID()
  assignedToId?: string;
}

// Campos anuláveis aceitam null para limpar o valor.
export class UpdateAssetDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(40)
  tag?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsIn(ASSET_TYPES)
  type?: AssetTypeName;

  @IsOptional()
  @IsIn(ASSET_STATUSES)
  status?: AssetStatusName;

  @ValidateIf((o: UpdateAssetDto) => o.serialNumber !== undefined && o.serialNumber !== null)
  @Transform(trim)
  @IsString()
  @MaxLength(120)
  serialNumber?: string | null;

  @ValidateIf((o: UpdateAssetDto) => o.purchaseDate !== undefined && o.purchaseDate !== null)
  @IsDateString({ strict: true })
  purchaseDate?: string | null;

  @ValidateIf((o: UpdateAssetDto) => o.notes !== undefined && o.notes !== null)
  @Transform(trim)
  @IsString()
  @MaxLength(1000)
  notes?: string | null;

  @ValidateIf((o: UpdateAssetDto) => o.assignedToId !== undefined && o.assignedToId !== null)
  @IsUUID()
  assignedToId?: string | null;
}

export class ListAssetsQuery {
  @IsOptional()
  @IsIn(ASSET_TYPES)
  type?: AssetTypeName;

  @IsOptional()
  @IsIn(ASSET_STATUSES)
  status?: AssetStatusName;

  @IsOptional()
  @IsUUID()
  assignedToId?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  q?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize: number = 20;
}
