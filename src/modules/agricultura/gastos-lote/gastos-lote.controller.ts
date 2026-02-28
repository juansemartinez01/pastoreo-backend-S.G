// src/modules/agricultura/gastos-lote/gastos-lote.controller.ts
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ok, page } from '../../../common/http/api-response';
import { PageQueryDto } from '../../../common/query/page-query.dto';

import { GastosLoteService } from './gastos-lote.service';
import { CreateGastoLoteDto } from './dto/create-gasto-lote.dto';
import { UpdateGastoLoteDto } from './dto/update-gasto-lote.dto';

@UseGuards(JwtAuthGuard)
@Controller('agricultura/gastos-lote')
export class GastosLoteController {
  constructor(private readonly service: GastosLoteService) {}

  @Get()
  async list(
    @Query()
    q: PageQueryDto & {
      loteId?: string;
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
  async create(@Req() _req: any, @Body() dto: CreateGastoLoteDto) {
    const created = await this.service.createOne(dto);
    return ok(created);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateGastoLoteDto) {
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
