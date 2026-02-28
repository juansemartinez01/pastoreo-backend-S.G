// src/modules/ganaderia/gastos-tropa/dto/update-gasto-tropa.dto.ts
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

export class UpdateGastoTropaDto {
  @IsOptional()
  @IsUUID()
  tropaId?: string;

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
  @Min(0)
  monto_ars?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  monto_usd?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  tipo_cambio?: number;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  notas?: string | null;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateAdjuntoDto)
  adjuntos?: CreateAdjuntoDto[];
}
