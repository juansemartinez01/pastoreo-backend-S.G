// src/modules/maestros/categorias/categorias.controller.ts
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

import { CategoriasService } from './categorias.service';
import { CreateCategoriaDto } from './dto/create-categoria.dto';
import { UpdateCategoriaDto } from './dto/update-categoria.dto';

@UseGuards(JwtAuthGuard)
@Controller('categorias')
export class CategoriasController {
  constructor(private readonly service: CategoriasService) {}

  @Get()
  async list(
    @Query()
    q: PageQueryDto & {
      search?: string;
      q?: string;
      sortBy?: string;
      sortOrder?: 'ASC' | 'DESC';
      activo?: string;
      centroCostoId?: string;
    },
  ) {
    const pageNum = Number(q.page ?? 1);
    const limit = Number(q.limit ?? 20);

    const res = await this.service.listCategorias(q);
    return page(res.items, pageNum, limit, res.total);
  }

  @Get(':id')
  async getOne(@Param('id') id: string) {
    const entity = await this.service.getOneOrFail(id);
    return ok(entity);
  }

  @Post()
  async create(@Body() dto: CreateCategoriaDto) {
    const created = await this.service.createOne(dto);
    return ok(created);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateCategoriaDto) {
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
