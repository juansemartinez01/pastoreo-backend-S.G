// src/modules/docs/adjuntos/dto/create-adjunto.dto.ts
import {
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  IsInt,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateAdjuntoDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  assetId?: string;

  @IsUrl()
  @MaxLength(500)
  url: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  mime?: string;

  @IsOptional()
  @IsString()
  @MaxLength(260)
  originalName?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sizeBytes?: number;
}
