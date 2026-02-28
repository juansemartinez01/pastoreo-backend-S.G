// src/modules/ganaderia/tropas/tropas.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryFailedError } from 'typeorm';

import { BaseCrudTenantService } from '../../../common/crud/base-crud.service';
import { AppError } from '../../../common/errors/app-error';
import { ErrorCodes } from '../../../common/errors/error-codes';
import { Tropa } from './entities/tropa.entity';

import { CreateTropaDto, EstadoTropa } from './dto/create-tropa.dto';
import { UpdateTropaDto } from './dto/update-tropa.dto';

@Injectable()
export class TropasService extends BaseCrudTenantService<Tropa> {
  constructor(@InjectRepository(Tropa) repo: Repository<Tropa>) {
    super(repo);
  }

  async listTropas(q: any) {
    const normalized = {
      ...q,
      q: q.q ?? q.search ?? undefined,
    };

    return super.list(normalized, {
      alias: 't',
      strictTenant: true,
      allowGlobal: false,
      searchColumns: ['codigo', 'nombre', 'notas'],
      sortAllowed: [
        'codigo',
        'nombre',
        'estado',
        'cabezasActuales',
        'created_at',
        'updated_at',
      ],
      sortFallback: { by: 'created_at', order: 'DESC' },
      filterAllowed: ['estado'],
    });
  }

  async getOneOrFail(id: string) {
    const row = await super.findById(id, {
      strictTenant: true,
      allowGlobal: false,
    });
    if (!row) {
      throw new AppError({
        code: ErrorCodes.TROPA_NOT_FOUND,
        message: 'Tropa no encontrada',
        status: 404,
        details: { id },
      });
    }
    return row;
  }

  async createOne(dto: CreateTropaDto) {
    this.ensureValid(dto.cabezas_actuales, dto.peso_prom_actual);

    try {
      return await super.create(
        {
          codigo: dto.codigo.trim(),
          nombre: dto.nombre.trim(),
          estado: dto.estado ?? EstadoTropa.ABIERTA,
          cabezasActuales: dto.cabezas_actuales,
          pesoPromActual: String(dto.peso_prom_actual),
          notas: dto.notas ?? null,
        } as any,
        { strictTenant: true, allowGlobal: false },
      );
    } catch (e) {
      this.handleDbErrors(e);
    }
  }

  async updateOne(id: string, dto: UpdateTropaDto) {
    const prev = await this.getOneOrFail(id);

    const cabezas = dto.cabezas_actuales ?? prev.cabezasActuales;
    const peso = dto.peso_prom_actual ?? Number(prev.pesoPromActual);
    this.ensureValid(cabezas, peso);

    // regla simple MVP: si está CERRADA, no permitir modificar cabezas/peso
    if (prev.estado === EstadoTropa.CERRADA) {
      if (
        dto.cabezas_actuales !== undefined ||
        dto.peso_prom_actual !== undefined
      ) {
        throw new AppError({
          code: ErrorCodes.TROPA_CERRADA_NO_EDITABLE,
          message: 'La tropa está cerrada; no se pueden modificar cabezas/peso',
          status: 400,
          details: { id },
        });
      }
    }

    try {
      return await super.update(
        id,
        {
          ...(dto.codigo !== undefined ? { codigo: dto.codigo.trim() } : {}),
          ...(dto.nombre !== undefined ? { nombre: dto.nombre.trim() } : {}),
          ...(dto.estado !== undefined ? { estado: dto.estado } : {}),
          ...(dto.cabezas_actuales !== undefined
            ? { cabezasActuales: dto.cabezas_actuales }
            : {}),
          ...(dto.peso_prom_actual !== undefined
            ? { pesoPromActual: String(dto.peso_prom_actual) }
            : {}),
          ...(dto.notas !== undefined ? { notas: dto.notas } : {}),
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
        code: ErrorCodes.TROPA_NOT_FOUND,
        message: 'Tropa no encontrada',
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
        code: ErrorCodes.TROPA_NOT_FOUND,
        message: 'Tropa no encontrada',
        status: 404,
        details: { id },
      });
    }
    return true;
  }

  private ensureValid(cabezas: number, peso: number) {
    if (cabezas < 0 || Number.isNaN(cabezas)) {
      throw new AppError({
        code: ErrorCodes.TROPA_INVALID,
        message: 'cabezas_actuales inválido',
        status: 400,
        details: { cabezas },
      });
    }
    if (peso < 0 || Number.isNaN(peso)) {
      throw new AppError({
        code: ErrorCodes.TROPA_INVALID,
        message: 'peso_prom_actual inválido',
        status: 400,
        details: { peso },
      });
    }
  }

  private handleDbErrors(e: unknown): never {
    if (e instanceof QueryFailedError) {
      const msg = (e as any)?.message as string | undefined;
      const code = (e as any)?.code as string | undefined;

      if (code === '23505') {
        throw new AppError({
          code: ErrorCodes.TROPA_DUPLICATE_CODIGO,
          message: 'Ya existe una tropa con ese código',
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
