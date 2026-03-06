// src/modules/agricultura/gastos-campania/gastos-campania.controller.ts
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

import { GastosCampaniaService } from './gastos-campania.service';
import { CreateGastoCampaniaDto } from './dto/create-gasto-campania.dto';
import { UpdateGastoCampaniaDto } from './dto/update-gasto-campania.dto';
import { QueryGastosCampaniaDto } from './dto/query-gastos-campania.dto';

@UseGuards(JwtAuthGuard)
@Controller('gastos-campania')
export class GastosCampaniaController {
  constructor(private readonly service: GastosCampaniaService) {}

  @Get()
  async list(@Query() q: QueryGastosCampaniaDto) {
    const res = await this.service.listGastos(q);
    return page(res.items, res.page, res.limit, res.total);
  }

  @Get(':id')
  async getOne(@Param('id') id: string) {
    const row = await this.service.getOneOrFail(id);
    return ok(row);
  }

  @Post()
  async create(@Body() dto: CreateGastoCampaniaDto) {
    const created = await this.service.createOne(dto);
    return ok(created);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateGastoCampaniaDto) {
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
