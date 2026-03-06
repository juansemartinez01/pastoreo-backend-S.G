// src/modules/agricultura/campanias/dto/query-campanias.dto.ts
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { PageQueryDto } from '../../../../common/query/page-query.dto';
import { EstadoCampania } from '../entities/campania.entity';

export class QueryCampaniasDto extends PageQueryDto {
  @IsOptional()
  @IsUUID()
  loteId?: string;

  @IsOptional()
  @IsUUID()
  pasturaId?: string;

  @IsOptional()
  @IsEnum(EstadoCampania)
  estadoActual?: EstadoCampania;

  @IsOptional()
  abierta?: 'true' | 'false';

  @IsOptional()
  search?: string;

  @IsOptional()
  q?: string;

  @IsOptional()
  sortBy?: string;

  @IsOptional()
  sortOrder?: 'ASC' | 'DESC';
}
