// src/modules/ganaderia/divisiones-tropa/dto/create-division-tropa.dto.ts
import {
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateDivisionTropaDto {
  @IsUUID()
  tropaOrigenId: string;

  @IsDateString()
  fecha: string; // ISO, normalizamos a YYYY-MM-DD

  // nueva tropa (se crea)
  @IsString()
  @MaxLength(40)
  codigoDestino: string;

  @IsString()
  @MaxLength(120)
  nombreDestino: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  cabezasDestino: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  pesoPromDestino: number;

  // opcional: si querés actualizar el peso prom de la tropa origen en la misma operación
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  pesoPromOrigenNuevo?: number;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  notas?: string;
}
