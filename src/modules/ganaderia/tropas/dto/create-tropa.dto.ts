// src/modules/ganaderia/tropas/dto/create-tropa.dto.ts
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

export enum EstadoTropa {
  ABIERTA = 'ABIERTA',
  CERRADA = 'CERRADA',
}

export class CreateTropaDto {
  @IsString()
  @MaxLength(40)
  codigo: string; // único por tenant

  @IsString()
  @MaxLength(120)
  nombre: string;

  @IsOptional()
  @IsEnum(EstadoTropa)
  estado?: EstadoTropa; // default ABIERTA

  @Type(() => Number)
  @IsInt()
  @Min(0)
  cabezas_actuales: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  peso_prom_actual: number;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  notas?: string;
}
