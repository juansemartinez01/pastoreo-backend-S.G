// src/modules/maestros/lotes/lotes.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';

import { BaseCrudTenantService } from '../../../common/crud/base-crud.service';
import { AppError } from '../../../common/errors/app-error';
import { ErrorCodes } from '../../../common/errors/error-codes';

import { applyTenantScope } from 'src/common/tenancy/apply-tenant-scope';

import { Lote, EstadoManualLote } from './entities/lote.entity';
import { Establecimiento } from '../establecimientos/entities/establecimiento.entity';
import { Pastura } from '../pasturas/entities/pastura.entity';

@Injectable()
export class LotesService extends BaseCrudTenantService<Lote> {
  constructor(
    @InjectRepository(Lote) repo: Repository<Lote>,
    @InjectRepository(Establecimiento)
    private readonly estRepo: Repository<Establecimiento>,
    @InjectRepository(Pastura)
    private readonly pastRepo: Repository<Pastura>,
  ) {
    super(repo);
  }

  async listLotes(q: any) {
    const normalized = { ...q, q: q.q ?? q.search ?? undefined };

    // filtros esperados:
    // establecimientoId, estado_manual, pasturaActualId
    return super.list(normalized, {
      alias: 'l',
      strictTenant: true,
      allowGlobal: false,
      searchColumns: ['nombre', 'ubicacion_texto'],
      sortAllowed: ['nombre', 'created_at', 'updated_at', 'estado_manual'],
      sortFallback: { by: 'created_at', order: 'DESC' },
      filterAllowed: ['establecimiento_id', 'estado_manual', 'pastura_actual_id'],
    });
  }

  async getOneOrFail(id: string) {
    const qb = this.repo.createQueryBuilder('l');
    applyTenantScope(qb, 'l');

    qb.leftJoinAndSelect('l.establecimiento', 'e');
    qb.leftJoinAndSelect('l.pasturaActual', 'p');

    qb.andWhere('l.id = :id', { id });

    const row = await qb.getOne();

    if (!row) {
      throw new AppError({
        code: ErrorCodes.LOTE_NOT_FOUND,
        message: 'Lote no encontrado',
        status: 404,
        details: { id },
      });
    }
    return row;
  }

  async createOne(dto: any) {
    await this.ensureEstablecimientoExists(dto.establecimientoId);
    if (dto.pasturaActualId)
      await this.ensurePasturaExists(dto.pasturaActualId);

    try {
      return await super.create(
        {
          ...dto,
          hectareas: String(dto.hectareas),
          estado_manual: dto.estado_manual ?? EstadoManualLote.DISPONIBLE,
          pasturaActualId: dto.pasturaActualId ?? null,
        } as any,
        { strictTenant: true, allowGlobal: false },
      );
    } catch (e) {
      this.handleDbErrors(e);
    }
  }

  async updateOne(id: string, dto: any) {
    const prev = await this.getOneOrFail(id);

    const establecimientoId = dto.establecimientoId ?? prev.establecimientoId;
    await this.ensureEstablecimientoExists(establecimientoId);

    if (dto.pasturaActualId !== undefined && dto.pasturaActualId !== null) {
      await this.ensurePasturaExists(dto.pasturaActualId);
    }

    try {
      return await super.update(
        id,
        {
          ...dto,
          ...(dto.hectareas !== undefined
            ? { hectareas: String(dto.hectareas) }
            : {}),
          ...(dto.pasturaActualId !== undefined
            ? { pasturaActualId: dto.pasturaActualId } // puede ser null para “quitar”
            : {}),
        } as any,
        { strictTenant: true, allowGlobal: false },
      );
    } catch (e) {
      this.handleDbErrors(e);
    }
  }

  async softDeleteOne(id: string) {
    const ok = await super.softDelete(id, {
      strictTenant: true,
      allowGlobal: false,
    });
    if (!ok) {
      throw new AppError({
        code: ErrorCodes.LOTE_NOT_FOUND,
        message: 'Lote no encontrado',
        status: 404,
        details: { id },
      });
    }
    return true;
  }

  async restoreOne(id: string) {
    const ok = await super.restore(id, {
      strictTenant: true,
      allowGlobal: false,
    });
    if (!ok) {
      throw new AppError({
        code: ErrorCodes.LOTE_NOT_FOUND,
        message: 'Lote no encontrado',
        status: 404,
        details: { id },
      });
    }
    return true;
  }

  private async ensureEstablecimientoExists(id: string) {
    const qb = this.estRepo.createQueryBuilder('e');
    applyTenantScope(qb, 'e');
    qb.andWhere('e.id = :id', { id });

    const exists = await qb.getOne();
    if (!exists) {
      throw new AppError({
        code: ErrorCodes.ESTABLECIMIENTO_NOT_FOUND,
        message: 'Establecimiento no encontrado',
        status: 404,
        details: { id },
      });
    }
  }

  private async ensurePasturaExists(id: string) {
    const qb = this.pastRepo.createQueryBuilder('p');
    applyTenantScope(qb, 'p');
    qb.andWhere('p.id = :id', { id });

    const exists = await qb.getOne();
    if (!exists) {
      throw new AppError({
        code: ErrorCodes.PASTURA_NOT_FOUND,
        message: 'Pastura no encontrada',
        status: 404,
        details: { id },
      });
    }
  }

  private handleDbErrors(e: unknown): never {
    if (e instanceof QueryFailedError) {
      const msg = (e as any)?.message as string | undefined;
      const code = (e as any)?.code as string | undefined;

      if (code === '23505') {
        throw new AppError({
          code: ErrorCodes.LOTE_DUPLICATE_NOMBRE,
          message: 'Ya existe un lote con ese nombre en ese establecimiento',
          status: 409,
        });
      }

      throw new AppError({
        code: ErrorCodes.INTERNAL,
        message: 'Error de base de datos',
        status: 500,
        details: { dbCode: code, dbMessage: msg },
      });
    }

    throw e as any;
  }
}
