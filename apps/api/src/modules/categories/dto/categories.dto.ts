import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, MaxLength, MinLength, ValidateIf } from 'class-validator';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class CreateCategoryDto {
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  name!: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(255)
  description?: string;
}

export class UpdateCategoryDto {
  @ValidateIf((o: UpdateCategoryDto) => o.name !== undefined)
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  name?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(255)
  description?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
