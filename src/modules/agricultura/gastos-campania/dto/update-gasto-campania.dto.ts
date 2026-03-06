// src/modules/agricultura/gastos-campania/dto/update-gasto-campania.dto.ts
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

export class UpdateGastoCampaniaDto {
  @IsOptional()
  @IsUUID()
  campaniaId?: string;

  @IsOptional()
  @IsUUID()
  proveedorId?: string | null;

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
