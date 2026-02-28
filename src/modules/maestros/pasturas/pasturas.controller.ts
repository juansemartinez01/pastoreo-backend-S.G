import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Delete,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PasturasService } from './pasturas.service';

import { ok, page } from '../../../common/http/api-response';
import { PageQueryDto } from '../../../common/query/page-query.dto';

import { CreatePasturaDto } from './dto/create-pastura.dto';
import { UpdatePasturaDto } from './dto/update-pastura.dto';
import { QueryPasturaPrecioAuditDto } from './dto/query-pastura-precio-audit.dto';

@UseGuards(JwtAuthGuard)
@Controller('pasturas')
export class PasturasController {
  constructor(private readonly service: PasturasService) {}

  @Get()
  async list(
    @Query()
    q: PageQueryDto & {
      search?: string;
      q?: string;
      sortBy?: string;
      sortOrder?: 'ASC' | 'DESC';
      activo?: string;
    },
  ) {
    const pageNum = Number(q.page ?? 1);
    const limit = Number(q.limit ?? 20);

    const res = await this.service.listPasturas(q);

    return page(res.items, pageNum, limit, res.total);
  }

  @Get(':id')
  async getOne(@Param('id') id: string) {
    const entity = await this.service.getOneOrFail(id);
    return ok(entity);
  }

  @Post()
  async create(@Req() req: any, @Body() dto: CreatePasturaDto) {
    const actor = {
      userId: req.user?.id,
      email: req.user?.email,
      requestId: req.requestId,
    };

    const created = await this.service.createOne(dto, actor);
    return ok(created);
  }

  @Put(':id')
  async update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdatePasturaDto,
  ) {
    const actor = {
      userId: req.user?.id,
      email: req.user?.email,
      requestId: req.requestId,
    };

    const updated = await this.service.updateOne(id, dto, actor);
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

  @Get(':id/precio-audit')
  async precioAudit(
    @Param('id') id: string,
    @Query() q: QueryPasturaPrecioAuditDto,
  ) {
    const pageNum = Number(q.page ?? 1);
    const limit = Number(q.limit ?? 50);

    const res = await this.service.getPrecioAudit(id, pageNum, limit);

    return page(res.rows, pageNum, limit, res.total);
  }
}
