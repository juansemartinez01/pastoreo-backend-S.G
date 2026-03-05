// src/modules/ganaderia/divisiones-tropa/dto/query-divisiones-tropa.dto.ts
import { IsDateString, IsOptional, IsUUID } from 'class-validator';

export class QueryDivisionesTropaDto {
  @IsOptional()
  @IsUUID()
  tropaOrigenId?: string;

  @IsOptional()
  @IsUUID()
  tropaDestinoId?: string;

  @IsOptional()
  @IsDateString()
  fechaDesde?: string;

  @IsOptional()
  @IsDateString()
  fechaHasta?: string;
}
