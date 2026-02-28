// src/modules/maestros/establecimientos/establecimientos.controller.ts
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ok, page } from '../../../common/http/api-response';
import { PageQueryDto } from '../../../common/query/page-query.dto';

import { EstablecimientosService } from './establecimientos.service';
import { CreateEstablecimientoDto } from './dto/create-establecimiento.dto';
import { UpdateEstablecimientoDto } from './dto/update-establecimiento.dto';

@UseGuards(JwtAuthGuard)
@Controller('establecimientos')
export class EstablecimientosController {
  constructor(private readonly service: EstablecimientosService) {}

  @Get()
  async list(
    @Query()
    q: PageQueryDto & {
      search?: string;
      q?: string;
      sortBy?: string;
      sortOrder?: 'ASC' | 'DESC';
    },
  ) {
    const pageNum = Number(q.page ?? 1);
    const limit = Number(q.limit ?? 20);

    const res = await this.service.listEstablecimientos(q);
    return page(res.items, pageNum, limit, res.total);
  }

  @Get(':id')
  async getOne(@Param('id') id: string) {
    const entity = await this.service.getOneOrFail(id);
    return ok(entity);
  }

  @Post()
  async create(@Body() dto: CreateEstablecimientoDto) {
    const created = await this.service.createOne(dto);
    return ok(created);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateEstablecimientoDto) {
    const updated = await this.service.updateOne(id, dto);
    return ok(updated);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.service.softDeleteOne(id);
    return ok(true);
  }

  @Post(':id/restore')
  async restore(@Param('id') id: string) {
    await this.service.restoreOne(id);
    return ok(true);
  }
}
