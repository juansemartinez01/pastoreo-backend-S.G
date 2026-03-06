// src/modules/agricultura/campanias/dto/create-campania.dto.ts
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { EstadoCampania } from '../entities/campania.entity';

export class CreateCampaniaDto {
  @IsUUID()
  loteId: string;

  @IsUUID()
  pasturaId: string;

  @IsString()
  @MaxLength(140)
  nombre: string;

  @IsDateString()
  fechaInicio: string;

  @IsOptional()
  @IsEnum(EstadoCampania)
  estadoActual?: EstadoCampania;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  notas?: string;
}
