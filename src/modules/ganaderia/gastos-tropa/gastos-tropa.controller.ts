// src/modules/ganaderia/gastos-tropa/gastos-tropa.controller.ts
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

import { GastosTropaService } from './gastos-tropa.service';
import { CreateGastoTropaDto } from './dto/create-gasto-tropa.dto';
import { UpdateGastoTropaDto } from './dto/update-gasto-tropa.dto';

@UseGuards(JwtAuthGuard)
@Controller('ganaderia/gastos-tropa')
export class GastosTropaController {
  constructor(private readonly service: GastosTropaService) {}

  @Get()
  async list(
    @Query()
    q: PageQueryDto & {
      tropaId?: string;
      proveedorId?: string;
      categoriaId?: string;
      fechaDesde?: string;
      fechaHasta?: string;
      search?: string;
      q?: string;
      sortBy?: string;
      sortOrder?: 'ASC' | 'DESC';
    },
  ) {
    const pageNum = Number(q.page ?? 1);
    const limit = Number(q.limit ?? 20);

    const res = await this.service.listGastos(q);
    return page(res.items, pageNum, limit, res.total);
  }

  @Get(':id')
  async getOne(@Param('id') id: string) {
    const entity = await this.service.getOneOrFail(id);
    return ok(entity);
  }

  @Post()
  async create(@Body() dto: CreateGastoTropaDto) {
    const created = await this.service.createOne(dto);
    return ok(created);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateGastoTropaDto) {
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
