// src/modules/pastoreo/ocupaciones/ocupaciones.controller.ts
import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

import { ok, page } from '../../../common/http/api-response';
import { PageQueryDto } from '../../../common/query/page-query.dto';

import { OcupacionesService } from './ocupaciones.service';
import { CreateOcupacionDto } from './dto/create-ocupacion.dto';
import { ConfirmarMovimientoDto } from './dto/confirmar-movimiento.dto';

@UseGuards(JwtAuthGuard)
@Controller('pastoreo/ocupaciones')
export class OcupacionesController {
  constructor(private readonly service: OcupacionesService) {}

  @Get()
  async list(
    @Query()
    q: PageQueryDto & {
      search?: string;
      q?: string;
      sortBy?: string;
      sortOrder?: 'ASC' | 'DESC';
      estado?: string;
      loteId?: string;
    },
  ) {
    const pageNum = Number(q.page ?? 1);
    const limit = Number(q.limit ?? 20);

    const res = await this.service.listOcupaciones(q);
    return page(res.items, pageNum, limit, res.total);
  }

  @Get(':id')
  async getOne(@Param('id') id: string) {
    const entity = await this.service.getOneOrFail(id);
    return ok(entity);
  }

  @Get(':id/detalle')
  async detalle(@Param('id') id: string) {
    const data = await this.service.getDetalle(id);
    return ok(data);
  }

  @Post()
  async create(@Body() dto: CreateOcupacionDto) {
    const created = await this.service.createOne(dto);
    return ok(created);
  }

  @Post(':id/confirmar-movimiento')
  async confirmarMovimiento(
    @Param('id') id: string,
    @Body() dto: ConfirmarMovimientoDto,
  ) {
    const done = await this.service.confirmarMovimiento(id, dto);
    return ok(done);
  }

  @Post(':id/cerrar')
  async cerrar(@Param('id') id: string, @Body() dto: ConfirmarMovimientoDto) {
    const done = await this.service.cerrar(id, dto);
    return ok(done);
  }
}
