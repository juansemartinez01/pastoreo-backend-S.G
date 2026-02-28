// src/modules/maestros/proveedores/proveedores.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';

import { BaseCrudTenantService } from '../../../common/crud/base-crud.service';
import { AppError } from '../../../common/errors/app-error';
import { ErrorCodes } from '../../../common/errors/error-codes';

import { Proveedor, TipoProveedor } from './entities/proveedor.entity';

@Injectable()
export class ProveedoresService extends BaseCrudTenantService<Proveedor> {
  constructor(@InjectRepository(Proveedor) repo: Repository<Proveedor>) {
    super(repo);
  }

  async listProveedores(q: any) {
    const normalized = {
      ...q,
      q: q.q ?? q.search ?? undefined,
    };

    return super.list(normalized, {
      alias: 'p',
      strictTenant: true,
      allowGlobal: false,
      searchColumns: ['nombre', 'cuit', 'email', 'telefono'],
      sortAllowed: ['nombre', 'created_at', 'updated_at', 'activo', 'tipo'],
      sortFallback: { by: 'created_at', order: 'DESC' },
      filterAllowed: ['activo', 'tipo'],
    });
  }

  async getOneOrFail(id: string) {
    const row = await super.findById(id, {
      strictTenant: true,
      allowGlobal: false,
    });
    if (!row) {
      throw new AppError({
        code: ErrorCodes.PROVEEDOR_NOT_FOUND,
        message: 'Proveedor no encontrado',
        status: 404,
        details: { id },
      });
    }
    return row;
  }

  async createOne(dto: any) {
    const cuit = this.normalizeCuit(dto.cuit);

    this.ensureValidTipo(dto.tipo);

    try {
      return await super.create(
        {
          ...dto,
          cuit,
          tipo: dto.tipo ?? TipoProveedor.OTRO,
          activo: dto.activo ?? true,
        } as any,
        { strictTenant: true, allowGlobal: false },
      );
    } catch (e) {
      this.handleDbErrors(e);
    }
  }

  async updateOne(id: string, dto: any) {
    await this.getOneOrFail(id);

    this.ensureValidTipo(dto.tipo);

    // Permite:
    // - dto.cuit = "20-..." -> normaliza
    // - dto.cuit = null -> limpia
    // - dto.cuit = undefined -> no toca
    const cuit =
      dto.cuit === undefined
        ? undefined
        : dto.cuit === null
          ? null
          : this.normalizeCuit(dto.cuit);

    try {
      return await super.update(
        id,
        {
          ...dto,
          ...(cuit !== undefined ? { cuit } : {}),
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
        code: ErrorCodes.PROVEEDOR_NOT_FOUND,
        message: 'Proveedor no encontrado',
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
        code: ErrorCodes.PROVEEDOR_NOT_FOUND,
        message: 'Proveedor no encontrado',
        status: 404,
        details: { id },
      });
    }
    return true;
  }

  // -----------------------
  // Helpers
  // -----------------------

  private normalizeCuit(input?: string | null): string | null {
    if (input === undefined || input === null) return null;

    const digits = String(input).replace(/\D/g, '').trim();
    if (!digits) return null;

    // MVP: aceptamos 11 (CUIT) o 8 (DNI) si alguien carga mal; si querés, lo cerramos a 11.
    // Yo recomiendo CUIT=11 para consistencia:
    if (digits.length !== 11) {
      throw new AppError({
        code: ErrorCodes.PROVEEDOR_CUIT_INVALID,
        message: 'CUIT inválido (debe tener 11 dígitos)',
        status: 400,
        details: { cuit: input, normalized: digits },
      });
    }

    return digits;
  }

  private ensureValidTipo(tipo?: string) {
    if (tipo === undefined) return;
    if (!Object.values(TipoProveedor).includes(tipo as any)) {
      throw new AppError({
        code: ErrorCodes.PROVEEDOR_TIPO_INVALID,
        message: 'Tipo de proveedor inválido',
        status: 400,
        details: { tipo },
      });
    }
  }

  private handleDbErrors(e: unknown): never {
    if (e instanceof QueryFailedError) {
      const msg = (e as any)?.message as string | undefined;
      const code = (e as any)?.code as string | undefined;
      const constraint = (e as any)?.constraint as string | undefined;

      if (code === '23505') {
        // Detectamos por nombre de índice/constraint (lo definimos en migration)
        if (constraint?.includes('ux_proveedores_tenant_cuit')) {
          throw new AppError({
            code: ErrorCodes.PROVEEDOR_DUPLICATE_CUIT,
            message: 'Ya existe un proveedor con ese CUIT',
            status: 409,
          });
        }

        if (constraint?.includes('ux_proveedores_tenant_nombre')) {
          throw new AppError({
            code: ErrorCodes.PROVEEDOR_DUPLICATE_NOMBRE,
            message: 'Ya existe un proveedor con ese nombre',
            status: 409,
          });
        }

        // fallback
        throw new AppError({
          code: ErrorCodes.PROVEEDOR_DUPLICATE,
          message: 'Registro duplicado',
          status: 409,
          details: { constraint, dbMessage: msg },
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
