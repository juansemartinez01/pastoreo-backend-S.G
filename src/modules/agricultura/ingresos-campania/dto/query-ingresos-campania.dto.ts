// src/modules/agricultura/ingresos-campania/dto/query-ingresos-campania.dto.ts
import { IsOptional, IsUUID } from 'class-validator';
import { PageQueryDto } from '../../../../common/query/page-query.dto';

export class QueryIngresosCampaniaDto extends PageQueryDto {
  @IsOptional()
  @IsUUID()
  campaniaId?: string;

  @IsOptional()
  @IsUUID()
  loteId?: string;

  @IsOptional()
  @IsUUID()
  categoriaId?: string;

  @IsOptional()
  fechaDesde?: string;

  @IsOptional()
  fechaHasta?: string;

  @IsOptional()
  search?: string;

  @IsOptional()
  q?: string;

  @IsOptional()
  sortBy?: string;

  @IsOptional()
  sortOrder?: 'ASC' | 'DESC';
}
