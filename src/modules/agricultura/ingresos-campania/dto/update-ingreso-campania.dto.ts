// src/modules/agricultura/ingresos-campania/dto/update-ingreso-campania.dto.ts
import {
  IsArray,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateIngresoCampaniaDto {
  @IsOptional()
  @IsUUID()
  campaniaId?: string;

  @IsOptional()
  @IsUUID()
  categoriaId?: string;

  @IsOptional()
  @IsDateString()
  fecha?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  monto_ars?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  monto_usd?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  tipo_cambio?: number;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  notas?: string | null;

  @IsOptional()
  @IsArray()
  adjuntos?: any[];
}
