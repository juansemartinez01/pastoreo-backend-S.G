// src/modules/maestros/centros-costo/centros-costo.controller.ts
import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ok, page } from '../../../common/http/api-response';
import { PageQueryDto } from '../../../common/query/page-query.dto';

import { CentrosCostoService } from './centros-costo.service';
import { CreateCentroCostoDto } from './dto/create-centro-costo.dto';
import { UpdateCentroCostoDto } from './dto/update-centro-costo.dto';

@UseGuards(JwtAuthGuard)
@Controller('centros-costo')
export class CentrosCostoController {
  constructor(private readonly service: CentrosCostoService) {}

  @Get()
  async list(
    @Query()
    q: PageQueryDto & {
      search?: string;
      q?: string;
      sortBy?: string;
      sortOrder?: 'ASC' | 'DESC';
      activo?: string;
      nombre?: string;
    },
  ) {
    const pageNum = Number(q.page ?? 1);
    const limit = Number(q.limit ?? 20);

    const res = await this.service.listCentros(q);
    return page(res.items, pageNum, limit, res.total);
  }

  @Get(':id')
  async getOne(@Param('id') id: string) {
    const entity = await this.service.getOneOrFail(id);
    return ok(entity);
  }

  // En catálogo fijo no se usa, pero lo dejamos por consistencia
  @Post()
  async create(@Body() dto: CreateCentroCostoDto) {
    const created = await this.service.createOne(dto);
    return ok(created);
  }

  // Permitimos update de descripcion/activo (pero NO de nombre)
  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateCentroCostoDto) {
    const updated = await this.service.updateOne(id, dto);
    return ok(updated);
  }

  // Bloqueado por service (catálogo fijo)
  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.service.softDeleteOne(id);
    return ok(true);
  }

  // No aplica
  @Post(':id/restore')
  async restore(@Param('id') id: string) {
    await this.service.restoreOne(id);
    return ok(true);
  }
}
