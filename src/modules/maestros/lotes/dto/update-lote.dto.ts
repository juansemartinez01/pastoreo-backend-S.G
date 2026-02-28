// src/modules/maestros/lotes/dto/update-lote.dto.ts
import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  IsNumber,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { EstadoManualLote } from '../entities/lote.entity';

export class UpdateLoteDto {
  @IsOptional()
  @IsUUID()
  establecimientoId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  nombre?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.0001)
  hectareas?: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  ubicacion_texto?: string | null;

  @IsOptional()
  @IsEnum(EstadoManualLote)
  estado_manual?: EstadoManualLote;

  @IsOptional()
  @IsUUID()
  pasturaActualId?: string | null;
}
