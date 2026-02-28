// src/modules/maestros/centros-costo/centros-costo.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';

import { BaseCrudTenantService } from '../../../common/crud/base-crud.service';
import { AppError } from '../../../common/errors/app-error';
import { ErrorCodes } from '../../../common/errors/error-codes';

import { CentroCosto, NombreCentroCosto } from './entities/centro-costo.entity';
import { applyTenantScope } from 'src/common/tenancy/apply-tenant-scope';
import { tenantContext } from 'src/modules/tenancy/tenant-context';

function currentTenantIdOrFail(): string {
  const store = (tenantContext as any).getStore?.();
  const t = store?.tenantId ?? null;
  if (!t) {
    throw new AppError({
      code: ErrorCodes.TENANT_REQUIRED,
      message: 'Tenant requerido',
      status: 400,
    });
  }
  return String(t);
}

@Injectable()
export class CentrosCostoService extends BaseCrudTenantService<CentroCosto> {
  constructor(@InjectRepository(CentroCosto) repo: Repository<CentroCosto>) {
    super(repo);
  }

  // ✅ Seed idempotente por tenant (Opción A)
  async ensureSeed(): Promise<void> {
    const tenantId = currentTenantIdOrFail();

    const qb = this.repo.createQueryBuilder('c');
    applyTenantScope(qb, 'c');
    qb.andWhere('c.deleted_at IS NULL');

    const rows = await qb.getMany();
    const hasAgri = rows.some(
      (r) => r.nombre === NombreCentroCosto.AGRICULTURA,
    );
    const hasGana = rows.some((r) => r.nombre === NombreCentroCosto.GANADERIA);

    const toCreate: Partial<CentroCosto>[] = [];
    if (!hasAgri) {
      toCreate.push({
        tenant_id: tenantId,
        nombre: NombreCentroCosto.AGRICULTURA,
        descripcion: 'Centro de costo Agricultura',
        activo: true,
      } as any);
    }
    if (!hasGana) {
      toCreate.push({
        tenant_id: tenantId,
        nombre: NombreCentroCosto.GANADERIA,
        descripcion: 'Centro de costo Ganadería',
        activo: true,
      } as any);
    }

    if (toCreate.length) {
      // idempotente: si hay race, el unique index lo protege
      try {
        await this.repo.save(toCreate.map((x) => this.repo.create(x)));
      } catch (e) {
        // si chocan índices únicos en paralelo, lo ignoramos y seguimos
        // (pero sólo si es 23505)
        if (e instanceof QueryFailedError && (e as any)?.code === '23505')
          return;
        throw e;
      }
    }
  }

  async listCentros(q: any) {
    await this.ensureSeed();

    const normalized = { ...q, q: q.q ?? q.search ?? undefined };

    return super.list(normalized, {
      alias: 'c',
      strictTenant: true,
      allowGlobal: false,
      searchColumns: ['descripcion'],
      sortAllowed: ['nombre', 'created_at', 'updated_at', 'activo'],
      sortFallback: { by: 'nombre', order: 'ASC' },
      filterAllowed: ['activo', 'nombre'],
    });
  }

  async getOneOrFail(id: string) {
    await this.ensureSeed();

    const row = await super.findById(id, {
      strictTenant: true,
      allowGlobal: false,
    });
    if (!row) {
      throw new AppError({
        code: ErrorCodes.CENTRO_COSTO_NOT_FOUND,
        message: 'Centro de costo no encontrado',
        status: 404,
        details: { id },
      });
    }
    return row;
  }

  async createOne(dto: any) {
    await this.ensureSeed();

    // En opción A, sólo existen AGRICULTURA/GANADERIA.
    // Si ya están, devolver conflicto.
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

    // 🔒 Bloqueamos cambio de nombre (catálogo fijo)
    if (dto.nombre !== undefined && dto.nombre !== prev.nombre) {
      throw new AppError({
        code: ErrorCodes.CENTRO_COSTO_NOMBRE_INMUTABLE,
        message:
          'No se puede cambiar el nombre del centro de costo (catálogo fijo)',
        status: 400,
        details: { from: prev.nombre, to: dto.nombre },
      });
    }

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
    const row = await this.getOneOrFail(id);

    // 🔒 No permitir borrar (catálogo fijo)
    throw new AppError({
      code: ErrorCodes.CENTRO_COSTO_DELETE_FORBIDDEN,
      message: 'No se puede eliminar un centro de costo (catálogo fijo)',
      status: 409,
      details: { id, nombre: row.nombre },
    });
  }

  async restoreOne(_id: string) {
    // Si no permitimos borrar, restore no aplica, pero mantenemos endpoint consistente
    throw new AppError({
      code: ErrorCodes.CENTRO_COSTO_RESTORE_NOT_APPLICABLE,
      message:
        'Restore no aplica: centros de costo no se eliminan en catálogo fijo',
      status: 409,
    });
  }

  async getByNombreOrFail(nombre: NombreCentroCosto) {
    await this.ensureSeed();

    const qb = this.repo.createQueryBuilder('c');
    applyTenantScope(qb, 'c');
    qb.andWhere('c.nombre = :nombre', { nombre });
    qb.andWhere('c.deleted_at IS NULL');

    const row = await qb.getOne();
    if (!row) {
      throw new AppError({
        code: ErrorCodes.CENTRO_COSTO_NOT_FOUND,
        message: 'Centro de costo no encontrado',
        status: 404,
        details: { nombre },
      });
    }
    return row;
  }

  private handleDbErrors(e: unknown): never {
    if (e instanceof QueryFailedError) {
      const msg = (e as any)?.message as string | undefined;
      const code = (e as any)?.code as string | undefined;
      const constraint = (e as any)?.constraint as string | undefined;

      if (code === '23505') {
        throw new AppError({
          code: ErrorCodes.CENTRO_COSTO_DUPLICATE,
          message: 'Ya existe ese centro de costo',
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
