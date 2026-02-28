// src/modules/ganaderia/gastos-tropa/dto/create-gasto-tropa.dto.ts
import {
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  IsNumber,
  Min,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateAdjuntoDto } from '../../../docs/adjuntos/dto/create-adjunto.dto';

export class CreateGastoTropaDto {
  @IsUUID()
  tropaId: string;

  @IsOptional()
  @IsUUID()
  proveedorId?: string;

  @IsUUID()
  categoriaId: string;

  @IsDateString()
  fecha: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  monto_ars: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  monto_usd: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  tipo_cambio: number;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  notas?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateAdjuntoDto)
  adjuntos?: CreateAdjuntoDto[];
}
