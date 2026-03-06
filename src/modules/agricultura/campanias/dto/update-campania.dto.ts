// src/modules/agricultura/campanias/dto/update-campania.dto.ts
import {
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class UpdateCampaniaDto {
  @IsOptional()
  @IsUUID()
  loteId?: string;

  @IsOptional()
  @IsUUID()
  pasturaId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(140)
  nombre?: string;

  @IsOptional()
  @IsDateString()
  fechaInicio?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  notas?: string | null;
}
