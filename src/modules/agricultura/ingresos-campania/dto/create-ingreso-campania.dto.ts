// src/modules/agricultura/ingresos-campania/dto/create-ingreso-campania.dto.ts
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

export class CreateIngresoCampaniaDto {
  @IsUUID()
  campaniaId: string;

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
