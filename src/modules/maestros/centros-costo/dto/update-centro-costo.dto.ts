// src/modules/maestros/centros-costo/dto/update-centro-costo.dto.ts
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { NombreCentroCosto } from '../entities/centro-costo.entity';

export class UpdateCentroCostoDto {
  // En opción A, el nombre NO debería cambiar. Lo dejamos opcional por consistencia,
  // pero el service lo bloquea (no permite cambiarlo).
  @IsOptional()
  @IsEnum(NombreCentroCosto)
  nombre?: NombreCentroCosto;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  descripcion?: string | null;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
