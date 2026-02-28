// src/modules/maestros/proveedores/dto/create-proveedor.dto.ts
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { TipoProveedor } from '../entities/proveedor.entity';

export class CreateProveedorDto {
  @IsString()
  @MaxLength(160)
  nombre: string;

  // Lo normalizamos a solo números en el service (acepta con guiones/espacios)
  @IsOptional()
  @IsString()
  @MaxLength(20)
  cuit?: string;

  @IsOptional()
  @IsEnum(TipoProveedor)
  tipo?: TipoProveedor;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  telefono?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(120)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  notas?: string;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
