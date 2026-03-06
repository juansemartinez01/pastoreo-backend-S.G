// src/modules/agricultura/ingresos-campania/ingresos-campania.controller.ts
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

import { IngresosCampaniaService } from './ingresos-campania.service';
import { CreateIngresoCampaniaDto } from './dto/create-ingreso-campania.dto';
import { UpdateIngresoCampaniaDto } from './dto/update-ingreso-campania.dto';
import { QueryIngresosCampaniaDto } from './dto/query-ingresos-campania.dto';

@UseGuards(JwtAuthGuard)
@Controller('ingresos-campania')
export class IngresosCampaniaController {
  constructor(private readonly service: IngresosCampaniaService) {}

  @Get()
  async list(@Query() q: QueryIngresosCampaniaDto) {
    const res = await this.service.listIngresos(q);
    return page(res.items, res.page, res.limit, res.total);
  }

  @Get(':id')
  async getOne(@Param('id') id: string) {
    const row = await this.service.getOneOrFail(id);
    return ok(row);
  }

  @Post()
  async create(@Body() dto: CreateIngresoCampaniaDto) {
    const created = await this.service.createOne(dto);
    return ok(created);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateIngresoCampaniaDto) {
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
