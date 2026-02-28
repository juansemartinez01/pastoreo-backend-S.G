// src/modules/ganaderia/tropas/dto/update-tropa.dto.ts
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';
import { EstadoTropa } from './create-tropa.dto';

export class UpdateTropaDto {
  @IsOptional()
  @IsString()
  @MaxLength(40)
  codigo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  nombre?: string;

  @IsOptional()
  @IsEnum(EstadoTropa)
  estado?: EstadoTropa;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  cabezas_actuales?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  peso_prom_actual?: number;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  notas?: string | null;
}
