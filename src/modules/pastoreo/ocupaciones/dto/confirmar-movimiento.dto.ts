// src/modules/pastoreo/ocupaciones/dto/confirmar-movimiento.dto.ts
import {
  IsArray,
  IsDateString,
  IsOptional,
  IsUUID,
  ValidateNested,
  IsInt,
  Min,
  IsNumber,
  IsString,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ConfirmMovimientoTropaDto {
  @IsUUID()
  tropaId: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  cabezas_fin: number; // si no cambia, mandá el mismo valor

  @Type(() => Number)
  @IsNumber()
  @Min(0.1)
  peso_fin: number; // Pf obligatorio
}

export class ConfirmarMovimientoDto {
  @IsDateString()
  fecha_hasta: string;

  // opcional: si ya sabes a qué lote va después, lo guardamos como hint (post MVP se usa)
  @IsOptional()
  @IsUUID()
  loteDestinoId?: string;

  // estado del lote al cerrar: default DESCANSO
  @IsOptional()
  @IsString()
  @IsIn(['DISPONIBLE', 'DESCANSO', 'OCUPADO', 'NO_DISPONIBLE'])
  estadoLoteAlCerrar?: 'DISPONIBLE' | 'DESCANSO' | 'OCUPADO' | 'NO_DISPONIBLE';

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConfirmMovimientoTropaDto)
  tropas: ConfirmMovimientoTropaDto[];
}
