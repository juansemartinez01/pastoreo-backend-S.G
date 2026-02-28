// src/modules/maestros/establecimientos/dto/update-establecimiento.dto.ts
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateEstablecimientoDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  nombre?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  ubicacion_texto?: string | null;
}
