// src/modules/maestros/categorias/dto/create-categoria.dto.ts
import {
  IsBoolean,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateCategoriaDto {
  @IsUUID()
  centroCostoId: string;

  @IsString()
  @MaxLength(120)
  nombre: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  descripcion?: string;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
