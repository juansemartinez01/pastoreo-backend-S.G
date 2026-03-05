// src/modules/ganaderia/eventos-muerte/eventos-muerte.controller.ts
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ok, page } from '../../../common/http/api-response';
import { PageQueryDto } from '../../../common/query/page-query.dto';

import { EventosMuerteService } from './eventos-muerte.service';
import { CreateEventoMuerteDto } from './dto/create-evento-muerte.dto';
import { QueryEventosMuerteDto } from './dto/query-eventos-muerte.dto';

@UseGuards(JwtAuthGuard)
@Controller('ganaderia/eventos-muerte')
export class EventosMuerteController {
  constructor(private readonly service: EventosMuerteService) {}

  @Get()
  async list(
    @Query()
    q: PageQueryDto &
      QueryEventosMuerteDto & {
        search?: string;
        q?: string;
        sortBy?: string;
        sortOrder?: 'ASC' | 'DESC';
      },
  ) {
    const pageNum = Number(q.page ?? 1);
    const limit = Number(q.limit ?? 20);

    const res = await this.service.list(q);
    return page(res.items, pageNum, limit, res.total);
  }

  @Get(':id')
  async getOne(@Param('id') id: string) {
    const row = await this.service.getOneOrFail(id);
    return ok(row);
  }

  @Post()
  async create(@Body() dto: CreateEventoMuerteDto) {
    const created = await this.service.createOne(dto);
    return ok(created);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    const done = await this.service.softDeleteOne(id);
    return ok(done);
  }

  @Post(':id/restore')
  async restore(@Param('id') id: string) {
    const done = await this.service.restoreOne(id);
    return ok(done);
  }
}
