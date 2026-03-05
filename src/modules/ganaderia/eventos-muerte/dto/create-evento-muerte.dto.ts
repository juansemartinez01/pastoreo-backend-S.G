// src/modules/ganaderia/eventos-muerte/dto/create-evento-muerte.dto.ts
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateEventoMuerteDto {
  @IsUUID()
  tropaId: string;

  @IsDateString()
  fecha: string; // aceptamos ISO, lo normalizamos a YYYY-MM-DD en service

  @Type(() => Number)
  @IsInt()
  @Min(1)
  cabezas: number;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  notas?: string;
}
