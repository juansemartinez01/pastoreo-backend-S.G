// src/modules/maestros/lotes/dto/create-lote.dto.ts
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

export class CreateLoteDto {
  @IsUUID()
  establecimientoId: string;

  @IsString()
  @MaxLength(120)
  nombre: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.0001)
  hectareas: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  ubicacion_texto?: string;

  @IsOptional()
  @IsEnum(EstadoManualLote)
  estado_manual?: EstadoManualLote;

  @IsOptional()
  @IsUUID()
  pasturaActualId?: string | null;
}
