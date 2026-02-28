import {
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
  IsNumber,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdatePasturaDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  nombre?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  descripcion?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  precio_kg_ars?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  precio_kg_usd?: number;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
