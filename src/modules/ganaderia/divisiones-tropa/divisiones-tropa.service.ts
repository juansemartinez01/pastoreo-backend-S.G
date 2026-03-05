// src/modules/ganaderia/divisiones-tropa/divisiones-tropa.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, DeepPartial, QueryFailedError, Repository } from 'typeorm';

import { AppError } from '../../../common/errors/app-error';
import { ErrorCodes } from '../../../common/errors/error-codes';
import { applyTenantScope } from '../../../common/tenancy/apply-tenant-scope';

import { DivisionTropa } from './entities/division-tropa.entity';
import { Tropa } from '../tropas/entities/tropa.entity';
import { EstadoTropa } from '../tropas/dto/create-tropa.dto';

import { CreateDivisionTropaDto } from './dto/create-division-tropa.dto';
import { QueryDivisionesTropaDto } from './dto/query-divisiones-tropa.dto';

import { tenantContext } from 'src/modules/tenancy/tenant-context';

function currentTenantId(): string | null {
  const store = (tenantContext as any).getStore?.();
  const t = store?.tenantId ?? null;
  return t ? String(t) : null;
}

function normalizeDateToYMD(input: string): string {
  if (!input || input.length < 10) return input;
  return input.slice(0, 10);
}

@Injectable()
export class DivisionesTropaService {
  constructor(
    @InjectRepository(DivisionTropa)
    private readonly repo: Repository<DivisionTropa>,
    @InjectRepository(Tropa) private readonly tropaRepo: Repository<Tropa>,
    private readonly dataSource: DataSource,
  ) {}

  // =========================
  // LIST
  // =========================
  async list(q: any & QueryDivisionesTropaDto) {
    const page = Number(q.page ?? 1);
    const limit = Math.min(Number(q.limit ?? 20), 200);
    const skip = (page - 1) * limit;

    const qb = this.repo.createQueryBuilder('d');
    applyTenantScope(qb, 'd');
    qb.andWhere('d.deleted_at IS NULL');

    const search = (q.q ?? q.search ?? '').trim();
    if (search) {
      qb.andWhere('(d.notas ILIKE :s)', { s: `%${search}%` });
    }

    if (q.tropaOrigenId)
      qb.andWhere('d.tropa_origen_id = :id', { id: q.tropaOrigenId });
    if (q.tropaDestinoId)
      qb.andWhere('d.tropa_destino_id = :id2', { id2: q.tropaDestinoId });

    if (q.fechaDesde)
      qb.andWhere('d.fecha >= :fd', { fd: normalizeDateToYMD(q.fechaDesde) });
    if (q.fechaHasta)
      qb.andWhere('d.fecha <= :fh', { fh: normalizeDateToYMD(q.fechaHasta) });

    const sortBy = String(q.sortBy ?? 'fecha');
    const sortOrder = (
      String(q.sortOrder ?? 'DESC').toUpperCase() === 'ASC' ? 'ASC' : 'DESC'
    ) as 'ASC' | 'DESC';

    const sortMap: Record<string, string> = {
      fecha: 'd.fecha',
      created_at: 'd.created_at',
      updated_at: 'd.updated_at',
      cabezasTransferidas: 'd.cabezas_transferidas',
    };

    qb.orderBy(sortMap[sortBy] ?? 'd.fecha', sortOrder);
    qb.skip(skip).take(limit);

    const [items, total] = await qb.getManyAndCount();
    return { items, total, page, limit };
  }

  async getOneOrFail(id: string) {
    const qb = this.repo.createQueryBuilder('d');
    applyTenantScope(qb, 'd');
    qb.andWhere('d.id = :id', { id });
    qb.andWhere('d.deleted_at IS NULL');
    const row = await qb.getOne();

    if (!row) {
      throw new AppError({
        code: ErrorCodes.DIVISION_TROPA_NOT_FOUND,
        message: 'División de tropa no encontrada',
        status: 404,
        details: { id },
      });
    }
    return row;
  }

  // =========================
  // CREATE (crea tropa destino + registra división + mueve cabezas)
  // =========================
  async createOne(dto: CreateDivisionTropaDto) {
    const tenantId = currentTenantId();
    if (!tenantId) {
      throw new AppError({
        code: ErrorCodes.TENANT_REQUIRED,
        message: 'Tenant requerido',
        status: 400,
      });
    }

    const fecha = normalizeDateToYMD(dto.fecha);

    if (dto.cabezasDestino < 1) {
      throw new AppError({
        code: ErrorCodes.DIVISION_TROPA_INVALID,
        message: 'cabezasDestino inválido (>= 1)',
        status: 400,
        details: { cabezasDestino: dto.cabezasDestino },
      });
    }

    return this.dataSource.transaction(async (manager) => {
      // 1) Traer tropa origen (tenant-safe)
      const qbO = manager.getRepository(Tropa).createQueryBuilder('t');
      applyTenantScope(qbO, 't');
      qbO.andWhere('t.id = :id', { id: dto.tropaOrigenId });
      qbO.andWhere('t.deleted_at IS NULL');
      const origen = await qbO.getOne();

      if (!origen) {
        throw new AppError({
          code: ErrorCodes.TROPA_NOT_FOUND,
          message: 'Tropa origen no encontrada',
          status: 404,
          details: { id: dto.tropaOrigenId },
        });
      }

      if (origen.estado === EstadoTropa.CERRADA) {
        throw new AppError({
          code: ErrorCodes.TROPA_CERRADA_NO_DIVIDIR,
          message: 'La tropa está cerrada; no se puede dividir',
          status: 400,
          details: { tropaId: dto.tropaOrigenId },
        });
      }

      // 2) Descontar cabezas origen atómico
      const updOrigen = await manager
        .getRepository(Tropa)
        .createQueryBuilder()
        .update()
        .set({
          cabezasActuales: () => `"cabezas_actuales" - ${dto.cabezasDestino}`,
        } as any)
        .where('id = :id', { id: dto.tropaOrigenId })
        .andWhere('deleted_at IS NULL')
        .andWhere('"cabezas_actuales" >= :c', { c: dto.cabezasDestino })
        .execute();

      if (!updOrigen.affected) {
        throw new AppError({
          code: ErrorCodes.TROPA_CABEZAS_INSUFICIENTES,
          message: 'No hay suficientes cabezas en la tropa origen para dividir',
          status: 400,
          details: {
            tropaOrigenId: dto.tropaOrigenId,
            cabezasDestino: dto.cabezasDestino,
          },
        });
      }

      // 3) (opcional) actualizar peso origen
      if (dto.pesoPromOrigenNuevo !== undefined) {
        await manager
          .getRepository(Tropa)
          .update(
            { id: dto.tropaOrigenId } as any,
            { pesoPromActual: String(dto.pesoPromOrigenNuevo) } as any,
          );
      }

      // 4) Crear tropa destino (puede fallar por unique codigo)
      const tRepo = manager.getRepository(Tropa);

      let destino!: Tropa;

      try {
        const destinoEntity = tRepo.create({
          tenant_id: tenantId,
          codigo: dto.codigoDestino.trim(),
          nombre: dto.nombreDestino.trim(),
          estado: EstadoTropa.ABIERTA,
          cabezasActuales: dto.cabezasDestino,
          pesoPromActual: String(dto.pesoPromDestino),
          notas: null,
        } satisfies DeepPartial<Tropa>);

        destino = await tRepo.save(destinoEntity);
      } catch (e) {
        this.handleDbErrors(e);
      }

      // 5) Registrar división
      const dRepo = manager.getRepository(DivisionTropa);
      const div = await dRepo.save(
        dRepo.create({
          tenant_id: tenantId,
          tropaOrigenId: dto.tropaOrigenId,
          tropaDestinoId: destino!.id,
          fecha,
          cabezasTransferidas: dto.cabezasDestino,
          pesoPromDestino: String(dto.pesoPromDestino),
          pesoPromOrigenAnterior: String(origen.pesoPromActual),
          pesoPromOrigenNuevo:
            dto.pesoPromOrigenNuevo !== undefined
              ? String(dto.pesoPromOrigenNuevo)
              : null,
          notas: dto.notas ?? null,
          destinoCreado: true,
        } as any),
      );

      return div;
    });
  }

  // =========================
  // SOFT DELETE (revierte cabezas + soft delete destino + soft delete división)
  // =========================
  async softDeleteOne(id: string) {
    return this.dataSource.transaction(async (manager) => {
      const qb = manager.getRepository(DivisionTropa).createQueryBuilder('d');
      applyTenantScope(qb, 'd');
      qb.andWhere('d.id = :id', { id });
      qb.andWhere('d.deleted_at IS NULL');
      const div = await qb.getOne();

      if (!div) {
        throw new AppError({
          code: ErrorCodes.DIVISION_TROPA_NOT_FOUND,
          message: 'División de tropa no encontrada',
          status: 404,
          details: { id },
        });
      }

      // 1) sumar cabezas a origen
      await manager
        .getRepository(Tropa)
        .createQueryBuilder()
        .update()
        .set({
          cabezasActuales: () =>
            `"cabezas_actuales" + ${div.cabezasTransferidas}`,
        } as any)
        .where('id = :id', { id: div.tropaOrigenId })
        .andWhere('deleted_at IS NULL')
        .execute();

      // 2) restar cabezas a destino (debería ser >= transferidas)
      const updDest = await manager
        .getRepository(Tropa)
        .createQueryBuilder()
        .update()
        .set({
          cabezasActuales: () =>
            `"cabezas_actuales" - ${div.cabezasTransferidas}`,
        } as any)
        .where('id = :id', { id: div.tropaDestinoId })
        .andWhere('deleted_at IS NULL')
        .andWhere('"cabezas_actuales" >= :c', { c: div.cabezasTransferidas })
        .execute();

      if (!updDest.affected) {
        throw new AppError({
          code: ErrorCodes.DIVISION_TROPA_INVALID,
          message:
            'No se puede revertir la división: la tropa destino no tiene cabezas suficientes',
          status: 400,
          details: { divisionId: div.id, tropaDestinoId: div.tropaDestinoId },
        });
      }

      // 3) soft delete destino (MVP: destino creado por esta división)
      await manager
        .getRepository(Tropa)
        .softDelete({ id: div.tropaDestinoId } as any);

      // 4) soft delete división
      await manager
        .getRepository(DivisionTropa)
        .softDelete({ id: div.id } as any);

      return true;
    });
  }

  // =========================
  // RESTORE (restore división + restore destino + vuelve a aplicar movimiento)
  // =========================
  async restoreOne(id: string) {
    return this.dataSource.transaction(async (manager) => {
      const qb = manager.getRepository(DivisionTropa).createQueryBuilder('d');
      applyTenantScope(qb, 'd');
      qb.andWhere('d.id = :id', { id });
      qb.withDeleted();
      const div = await qb.getOne();

      if (!div) {
        throw new AppError({
          code: ErrorCodes.DIVISION_TROPA_NOT_FOUND,
          message: 'División de tropa no encontrada',
          status: 404,
          details: { id },
        });
      }

      if (!div.deleted_at) return true;

      // validar origen existe y ABIERTA
      const qbO = manager.getRepository(Tropa).createQueryBuilder('t');
      applyTenantScope(qbO, 't');
      qbO.andWhere('t.id = :id', { id: div.tropaOrigenId });
      qbO.andWhere('t.deleted_at IS NULL');
      const origen = await qbO.getOne();

      if (!origen) {
        throw new AppError({
          code: ErrorCodes.TROPA_NOT_FOUND,
          message: 'Tropa origen no encontrada',
          status: 404,
          details: { id: div.tropaOrigenId },
        });
      }
      if (origen.estado === EstadoTropa.CERRADA) {
        throw new AppError({
          code: ErrorCodes.TROPA_CERRADA_NO_DIVIDIR,
          message:
            'La tropa origen está cerrada; no se puede restaurar división',
          status: 400,
          details: { tropaOrigenId: div.tropaOrigenId },
        });
      }

      // restore destino (si estaba borrado)
      await manager
        .getRepository(Tropa)
        .restore({ id: div.tropaDestinoId } as any);

      // aplicar movimiento: restar a origen, sumar a destino (destino debería quedar >= 0)
      const updOrigen = await manager
        .getRepository(Tropa)
        .createQueryBuilder()
        .update()
        .set({
          cabezasActuales: () =>
            `"cabezas_actuales" - ${div.cabezasTransferidas}`,
        } as any)
        .where('id = :id', { id: div.tropaOrigenId })
        .andWhere('deleted_at IS NULL')
        .andWhere('"cabezas_actuales" >= :c', { c: div.cabezasTransferidas })
        .execute();

      if (!updOrigen.affected) {
        throw new AppError({
          code: ErrorCodes.TROPA_CABEZAS_INSUFICIENTES,
          message:
            'No hay suficientes cabezas en origen para restaurar la división',
          status: 400,
          details: {
            tropaOrigenId: div.tropaOrigenId,
            cabezas: div.cabezasTransferidas,
          },
        });
      }

      await manager
        .getRepository(Tropa)
        .createQueryBuilder()
        .update()
        .set({
          cabezasActuales: () =>
            `"cabezas_actuales" + ${div.cabezasTransferidas}`,
        } as any)
        .where('id = :id', { id: div.tropaDestinoId })
        .andWhere('deleted_at IS NULL')
        .execute();

      await manager.getRepository(DivisionTropa).restore({ id: div.id } as any);

      return true;
    });
  }

  private handleDbErrors(e: unknown): never {
    if (e instanceof QueryFailedError) {
      const code = (e as any)?.code as string | undefined;
      if (code === '23505') {
        // puede venir por ux_tropa_codigo_tenant
        throw new AppError({
          code: ErrorCodes.TROPA_DESTINO_DUPLICATE_CODIGO,
          message: 'Ya existe una tropa con ese código (destino)',
          status: 409,
        });
      }
      throw new AppError({
        code: ErrorCodes.INTERNAL,
        message: 'Error de base de datos',
        status: 500,
        details: { dbMessage: (e as any)?.message, dbCode: code },
      });
    }
    throw e as any;
  }
}
