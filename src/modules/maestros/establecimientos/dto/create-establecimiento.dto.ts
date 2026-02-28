// src/modules/maestros/establecimientos/dto/create-establecimiento.dto.ts
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateEstablecimientoDto {
  @IsString()
  @MaxLength(120)
  nombre: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  ubicacion_texto?: string;
}
