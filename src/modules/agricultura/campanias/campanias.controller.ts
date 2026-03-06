// src/modules/agricultura/campanias/campanias.controller.ts
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

import { CampaniasService } from './campanias.service';
import { CreateCampaniaDto } from './dto/create-campania.dto';
import { UpdateCampaniaDto } from './dto/update-campania.dto';
import { ChangeCampaniaStateDto } from './dto/change-campania-state.dto';
import { CerrarCampaniaDto } from './dto/cerrar-campania.dto';
import { QueryCampaniasDto } from './dto/query-campanias.dto';

@UseGuards(JwtAuthGuard)
@Controller('campanias')
export class CampaniasController {
  constructor(private readonly service: CampaniasService) {}

  @Get('/by-lote/:loteId/activa')
  async getActivaByLote(@Param('loteId') loteId: string) {
    const row = await this.service.getCampaniaActivaByLote(loteId);
    return ok(row);
  }

  
  @Get()
  async list(@Query() q: QueryCampaniasDto) {
    const res = await this.service.listCampanias(q);
    return page(res.items, res.page, res.limit, res.total);
  }

  @Get(':id')
  async getOne(@Param('id') id: string) {
    const entity = await this.service.getOneOrFail(id);
    return ok(entity);
  }

  @Post()
  async create(@Body() dto: CreateCampaniaDto, @Req() req: any) {
    const created = await this.service.createOne(dto, this.actorFromReq(req));
    return ok(created);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateCampaniaDto,
    @Req() req: any,
  ) {
    const updated = await this.service.updateOne(
      id,
      dto,
      this.actorFromReq(req),
    );
    return ok(updated);
  }

  @Post(':id/change-state')
  async changeState(
    @Param('id') id: string,
    @Body() dto: ChangeCampaniaStateDto,
    @Req() req: any,
  ) {
    const result = await this.service.changeState(
      id,
      dto,
      this.actorFromReq(req),
    );
    return ok(result);
  }

  @Post(':id/cerrar')
  async cerrar(
    @Param('id') id: string,
    @Body() dto: CerrarCampaniaDto,
    @Req() req: any,
  ) {
    const result = await this.service.cerrarCampania(
      id,
      dto,
      this.actorFromReq(req),
    );
    return ok(result);
  }

  @Get(':id/historial-estados')
  async historial(@Param('id') id: string) {
    const rows = await this.service.getHistorialEstados(id);
    return ok(rows);
  }

  @Get(':id/resumen-estados')
  async resumenEstados(@Param('id') id: string) {
    const rows = await this.service.getResumenDiasPorEstado(id);
    return ok(rows);
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

  private actorFromReq(req: any) {
    return {
      userId: req?.user?.id ?? req?.user?.sub ?? null,
      email: req?.user?.email ?? null,
      requestId: req?.id ?? req?.requestId ?? null,
    };
  }
}
