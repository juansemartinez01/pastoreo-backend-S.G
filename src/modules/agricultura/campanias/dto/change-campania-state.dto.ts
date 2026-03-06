// src/modules/agricultura/campanias/dto/change-campania-state.dto.ts
import { IsDateString, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { EstadoCampania } from '../entities/campania.entity';

export class ChangeCampaniaStateDto {
  @IsEnum(EstadoCampania)
  nuevoEstado: EstadoCampania;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  observaciones?: string;

  @IsOptional()
  @IsDateString()
  fechaCambio?: string;
}
