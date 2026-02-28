// src/modules/maestros/proveedores/proveedores.controller.ts
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

import { ProveedoresService } from './proveedores.service';
import { CreateProveedorDto } from './dto/create-proveedor.dto';
import { UpdateProveedorDto } from './dto/update-proveedor.dto';

@UseGuards(JwtAuthGuard)
@Controller('proveedores')
export class ProveedoresController {
  constructor(private readonly service: ProveedoresService) {}

  @Get()
  async list(
    @Query()
    q: PageQueryDto & {
      search?: string;
      q?: string;
      sortBy?: string;
      sortOrder?: 'ASC' | 'DESC';
      activo?: string;
      tipo?: string;
    },
  ) {
    const pageNum = Number(q.page ?? 1);
    const limit = Number(q.limit ?? 20);

    const res = await this.service.listProveedores(q);
    return page(res.items, pageNum, limit, res.total);
  }

  @Get(':id')
  async getOne(@Param('id') id: string) {
    const entity = await this.service.getOneOrFail(id);
    return ok(entity);
  }

  @Post()
  async create(@Body() dto: CreateProveedorDto) {
    const created = await this.service.createOne(dto);
    return ok(created);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateProveedorDto) {
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
