// src/modules/maestros/proveedores/dto/update-proveedor.dto.ts
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { TipoProveedor } from '../entities/proveedor.entity';

export class UpdateProveedorDto {
  @IsOptional()
  @IsString()
  @MaxLength(160)
  nombre?: string;

  // Puede ser string para setear, o null para limpiar el CUIT
  @IsOptional()
  @IsString()
  @MaxLength(20)
  cuit?: string | null;

  @IsOptional()
  @IsEnum(TipoProveedor)
  tipo?: TipoProveedor;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  telefono?: string | null;

  @IsOptional()
  @IsEmail()
  @MaxLength(120)
  email?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  notas?: string | null;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
