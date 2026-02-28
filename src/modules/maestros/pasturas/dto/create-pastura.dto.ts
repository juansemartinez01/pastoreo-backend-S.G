import {
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
  IsNumber,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePasturaDto {
  @IsString()
  @MaxLength(120)
  nombre: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  descripcion?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  precio_kg_ars: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  precio_kg_usd: number;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
