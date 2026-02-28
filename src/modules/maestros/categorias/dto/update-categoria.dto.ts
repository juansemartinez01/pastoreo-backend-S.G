// src/modules/maestros/categorias/dto/update-categoria.dto.ts
import {
  IsBoolean,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class UpdateCategoriaDto {
  @IsOptional()
  @IsUUID()
  centroCostoId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  nombre?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  descripcion?: string | null;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
