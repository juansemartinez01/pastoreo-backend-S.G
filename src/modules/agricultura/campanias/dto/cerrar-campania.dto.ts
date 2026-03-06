// src/modules/agricultura/campanias/dto/cerrar-campania.dto.ts
import { IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';

export class CerrarCampaniaDto {
  @IsOptional()
  @IsDateString()
  fechaCierre?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  observaciones?: string;
}
