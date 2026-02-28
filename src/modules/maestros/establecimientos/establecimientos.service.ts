// src/modules/maestros/establecimientos/establecimientos.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';

import { BaseCrudTenantService } from '../../../common/crud/base-crud.service';
import { AppError } from '../../../common/errors/app-error';
import { ErrorCodes } from '../../../common/errors/error-codes';

import { Establecimiento } from './entities/establecimiento.entity';
import { Lote } from '../lotes/entities/lote.entity';

@Injectable()
export class EstablecimientosService extends BaseCrudTenantService<Establecimiento> {
  constructor(
    @InjectRepository(Establecimiento) repo: Repository<Establecimiento>,
    @InjectRepository(Lote)
    private readonly lotesRepo: Repository<Lote>,
  ) {
    super(repo);
  }

  async listEstablecimientos(q: any) {
    const normalized = { ...q, q: q.q ?? q.search ?? undefined };

    return super.list(normalized, {
      alias: 'e',
      strictTenant: true,
      allowGlobal: false,
      searchColumns: ['nombre', 'ubicacion_texto'],
      sortAllowed: ['nombre', 'created_at', 'updated_at'],
      sortFallback: { by: 'created_at', order: 'DESC' },
      filterAllowed: [],
    });
  }

  async getOneOrFail(id: string) {
    const row = await super.findById(id, {
      strictTenant: true,
      allowGlobal: false,
    });
    if (!row) {
      throw new AppError({
        code: ErrorCodes.ESTABLECIMIENTO_NOT_FOUND,
        message: 'Establecimiento no encontrado',
        status: 404,
        details: { id },
      });
    }
    return row;
  }

  async createOne(dto: any) {
    try {
      return await super.create({ ...dto } as any, {
        strictTenant: true,
        allowGlobal: false,
      });
    } catch (e) {
      this.handleDbErrors(e);
    }
  }

  async updateOne(id: string, dto: any) {
    await this.getOneOrFail(id);

    try {
      return await super.update(id, { ...dto } as any, {
        strictTenant: true,
        allowGlobal: false,
      });
    } catch (e) {
      this.handleDbErrors(e);
    }
  }

  async softDeleteOne(id: string) {
    await this.getOneOrFail(id);

    // 🔒 Regla: no permitir borrar si tiene lotes activos (no deleted)
    const count = await this.lotesRepo.count({
      where: {
        establecimientoId: id as any,
        deleted_at: null as any,
      } as any,
    });

    if (count > 0) {
      throw new AppError({
        code: ErrorCodes.ESTABLECIMIENTO_HAS_LOTES,
        message:
          'No se puede eliminar el establecimiento: tiene lotes asociados',
        status: 409,
        details: { establecimientoId: id, lotesActivos: count },
      });
    }

    const ok = await super.softDelete(id, {
      strictTenant: true,
      allowGlobal: false,
    });
    if (!ok) {
      throw new AppError({
        code: ErrorCodes.ESTABLECIMIENTO_NOT_FOUND,
        message: 'Establecimiento no encontrado',
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
        code: ErrorCodes.ESTABLECIMIENTO_NOT_FOUND,
        message: 'Establecimiento no encontrado',
        status: 404,
        details: { id },
      });
    }
    return true;
  }

  private handleDbErrors(e: unknown): never {
    if (e instanceof QueryFailedError) {
      const msg = (e as any)?.message as string | undefined;
      const code = (e as any)?.code as string | undefined;

      if (code === '23505') {
        throw new AppError({
          code: ErrorCodes.ESTABLECIMIENTO_DUPLICATE_NOMBRE,
          message: 'Ya existe un establecimiento con ese nombre',
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
