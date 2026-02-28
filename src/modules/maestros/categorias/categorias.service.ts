// src/modules/maestros/categorias/categorias.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';

import { BaseCrudTenantService } from '../../../common/crud/base-crud.service';
import { AppError } from '../../../common/errors/app-error';
import { ErrorCodes } from '../../../common/errors/error-codes';

import { Categoria } from './entities/categoria.entity';
import { CentroCosto } from '../centros-costo/entities/centro-costo.entity';
import { CentrosCostoService } from '../centros-costo/centros-costo.service';

import { applyTenantScope } from 'src/common/tenancy/apply-tenant-scope';

@Injectable()
export class CategoriasService extends BaseCrudTenantService<Categoria> {
  constructor(
    @InjectRepository(Categoria) repo: Repository<Categoria>,
    @InjectRepository(CentroCosto)
    private readonly ccRepo: Repository<CentroCosto>,
    private readonly centrosCostoService: CentrosCostoService,
  ) {
    super(repo);
  }

  async listCategorias(q: any) {
    // Asegura que existan AGRI/GANA antes de usar categorías
    await this.centrosCostoService.ensureSeed();

    const normalized = { ...q, q: q.q ?? q.search ?? undefined };

    return super.list(normalized, {
      alias: 'c',
      strictTenant: true,
      allowGlobal: false,
      searchColumns: ['nombre', 'descripcion'],
      sortAllowed: ['nombre', 'created_at', 'updated_at', 'activo'],
      sortFallback: { by: 'created_at', order: 'DESC' },
      filterAllowed: ['activo', 'centro_costo_id'],
    });
  }

  async getOneOrFail(id: string) {
    await this.centrosCostoService.ensureSeed();

    const qb = this.repo.createQueryBuilder('c');
    applyTenantScope(qb, 'c');

    qb.leftJoinAndSelect('c.centroCosto', 'cc');

    qb.andWhere('c.id = :id', { id });

    const row = await qb.getOne();
    if (!row) {
      throw new AppError({
        code: ErrorCodes.CATEGORIA_NOT_FOUND,
        message: 'Categoría no encontrada',
        status: 404,
        details: { id },
      });
    }
    return row;
  }

  async createOne(dto: any) {
    await this.centrosCostoService.ensureSeed();
    await this.ensureCentroCostoExists(dto.centroCostoId);

    try {
      return await super.create(
        {
          ...dto,
          activo: dto.activo ?? true,
        } as any,
        { strictTenant: true, allowGlobal: false },
      );
    } catch (e) {
      this.handleDbErrors(e);
    }
  }

  async updateOne(id: string, dto: any) {
    const prev = await this.getOneOrFail(id);

    const centroCostoId = dto.centroCostoId ?? prev.centroCostoId;
    await this.ensureCentroCostoExists(centroCostoId);

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
    const ok = await super.softDelete(id, {
      strictTenant: true,
      allowGlobal: false,
    });
    if (!ok) {
      throw new AppError({
        code: ErrorCodes.CATEGORIA_NOT_FOUND,
        message: 'Categoría no encontrada',
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
        code: ErrorCodes.CATEGORIA_NOT_FOUND,
        message: 'Categoría no encontrada',
        status: 404,
        details: { id },
      });
    }
    return true;
  }

  private async ensureCentroCostoExists(id: string) {
    const qb = this.ccRepo.createQueryBuilder('cc');
    applyTenantScope(qb, 'cc');
    qb.andWhere('cc.id = :id', { id });
    qb.andWhere('cc.deleted_at IS NULL');

    const row = await qb.getOne();
    if (!row) {
      throw new AppError({
        code: ErrorCodes.CENTRO_COSTO_NOT_FOUND,
        message: 'Centro de costo no encontrado',
        status: 404,
        details: { id },
      });
    }
  }

  private handleDbErrors(e: unknown): never {
    if (e instanceof QueryFailedError) {
      const msg = (e as any)?.message as string | undefined;
      const code = (e as any)?.code as string | undefined;
      const constraint = (e as any)?.constraint as string | undefined;

      if (code === '23505') {
        throw new AppError({
          code: ErrorCodes.CATEGORIA_DUPLICATE,
          message:
            'Ya existe una categoría con ese nombre para ese centro de costo',
          status: 409,
          details: { constraint },
        });
      }

      throw new AppError({
        code: ErrorCodes.INTERNAL,
        message: 'Error de base de datos',
        status: 500,
        details: { dbCode: code, dbMessage: msg, constraint },
      });
    }

    throw e as any;
  }
}
