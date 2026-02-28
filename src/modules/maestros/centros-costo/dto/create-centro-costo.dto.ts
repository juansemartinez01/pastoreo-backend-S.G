// src/modules/maestros/centros-costo/dto/create-centro-costo.dto.ts
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { NombreCentroCosto } from '../entities/centro-costo.entity';

export class CreateCentroCostoDto {
  @IsEnum(NombreCentroCosto)
  nombre: NombreCentroCosto;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  descripcion?: string;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
