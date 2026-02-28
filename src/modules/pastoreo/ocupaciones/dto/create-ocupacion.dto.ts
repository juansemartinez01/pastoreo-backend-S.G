// src/modules/pastoreo/ocupaciones/dto/create-ocupacion.dto.ts
import {
  IsArray,
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
  IsInt,
  Min,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateOcupacionTropaDto {
  @IsUUID()
  tropaId: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  cabezas_inicio: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0.1)
  peso_inicio: number; // Pi obligatorio

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  aumento_diario: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  factor_engorde: number;
}

export class CreateOcupacionDto {
  @IsUUID()
  loteId: string;

  @IsDateString()
  fecha_desde: string;

  @IsOptional()
  @IsUUID()
  pasturaIdSnapshot?: string; // opcional (si querés “congelar” pastura al iniciar)

  @IsOptional()
  @IsString()
  @MaxLength(300)
  notas?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOcupacionTropaDto)
  tropas: CreateOcupacionTropaDto[];
}
