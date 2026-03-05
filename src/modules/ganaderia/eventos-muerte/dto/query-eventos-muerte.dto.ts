// src/modules/ganaderia/eventos-muerte/dto/query-eventos-muerte.dto.ts
import { IsDateString, IsOptional, IsUUID } from 'class-validator';

export class QueryEventosMuerteDto {
  @IsOptional()
  @IsUUID()
  tropaId?: string;

  @IsOptional()
  @IsDateString()
  fechaDesde?: string;

  @IsOptional()
  @IsDateString()
  fechaHasta?: string;
}
