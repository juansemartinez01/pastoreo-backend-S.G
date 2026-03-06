// src/modules/agricultura/gastos-campania/dto/create-gasto-campania.dto.ts
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

export class CreateGastoCampaniaDto {
  @IsUUID()
  campaniaId: string;

  @IsOptional()
  @IsUUID()
  proveedorId?: string | null;

  @IsUUID()
  categoriaId: string;

  @IsDateString()
  fecha: string;

  @Type(() => Number)
  @IsNumber()
  monto_ars: number;

  @Type(() => Number)
  @IsNumber()
  monto_usd: number;

  @Type(() => Number)
  @IsNumber()
  tipo_cambio: number;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  notas?: string | null;

  @IsOptional()
  @IsArray()
  adjuntos?: any[];
}
