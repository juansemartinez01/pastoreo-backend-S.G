// src/modules/ganaderia/eventos-muerte/eventos-muerte.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, QueryFailedError, Repository } from 'typeorm';

import { AppError } from '../../../common/errors/app-error';
import { ErrorCodes } from '../../../common/errors/error-codes';
import { applyTenantScope } from '../../../common/tenancy/apply-tenant-scope';

import { EventoMuerte } from './entities/evento-muerte.entity';
import { Tropa } from '../tropas/entities/tropa.entity';
import { EstadoTropa } from '../tropas/dto/create-tropa.dto';

import { CreateEventoMuerteDto } from './dto/create-evento-muerte.dto';
import { QueryEventosMuerteDto } from './dto/query-eventos-muerte.dto';

import { tenantContext } from 'src/modules/tenancy/tenant-context';

function currentTenantId(): string | null {
  const store = (tenantContext as any).getStore?.();
  const t = store?.tenantId ?? null;
  return t ? String(t) : null;
}

function normalizeDateToYMD(input: string): string {
  // acepta "YYYY-MM-DD" o "YYYY-MM-DDTHH:mm:ssZ"
  if (!input || input.length < 10) return input;
  return input.slice(0, 10);
}

@Injectable()
export class EventosMuerteService {
  constructor(
    @InjectRepository(EventoMuerte)
    private readonly repo: Repository<EventoMuerte>,
    @InjectRepository(Tropa)
    private readonly tropaRepo: Repository<Tropa>,
    private readonly dataSource: DataSource,
  ) {}

  // =========================================================
  // LIST (paginado + filtros fecha/tropa + search notas)
  // =========================================================
  async list(q: any & QueryEventosMuerteDto) {
    const page = Number(q.page ?? 1);
    const limit = Math.min(Number(q.limit ?? 20), 200);
    const skip = (page - 1) * limit;

    const qb = this.repo.createQueryBuilder('e');
    applyTenantScope(qb, 'e');
    qb.andWhere('e.deleted_at IS NULL');

    const search = (q.q ?? q.search ?? '').trim();
    if (search) {
      qb.andWhere('(e.notas ILIKE :s)', { s: `%${search}%` });
    }

    if (q.tropaId) qb.andWhere('e.tropa_id = :tropaId', { tropaId: q.tropaId });

    if (q.fechaDesde) {
      qb.andWhere('e.fecha >= :fd', { fd: normalizeDateToYMD(q.fechaDesde) });
    }
    if (q.fechaHasta) {
      qb.andWhere('e.fecha <= :fh', { fh: normalizeDateToYMD(q.fechaHasta) });
    }

    const sortBy = String(q.sortBy ?? 'fecha');
    const sortOrder = (
      String(q.sortOrder ?? 'DESC').toUpperCase() === 'ASC' ? 'ASC' : 'DESC'
    ) as 'ASC' | 'DESC';

    const sortMap: Record<string, string> = {
      fecha: 'e.fecha',
      cabezas: 'e.cabezas',
      created_at: 'e.created_at',
      updated_at: 'e.updated_at',
    };

    qb.orderBy(sortMap[sortBy] ?? 'e.fecha', sortOrder);

    qb.skip(skip).take(limit);

    const [items, total] = await qb.getManyAndCount();
    return { items, total, page, limit };
  }

  async getOneOrFail(id: string) {
    const qb = this.repo.createQueryBuilder('e');
    applyTenantScope(qb, 'e');
    qb.andWhere('e.id = :id', { id });
    qb.andWhere('e.deleted_at IS NULL');
    const row = await qb.getOne();

    if (!row) {
      throw new AppError({
        code: ErrorCodes.EVENTO_MUERTE_NOT_FOUND,
        message: 'Evento de muerte no encontrado',
        status: 404,
        details: { id },
      });
    }
    return row;
  }

  // =========================================================
  // CREATE (crea evento + descuenta cabezas actuales)
  // =========================================================
  async createOne(dto: CreateEventoMuerteDto) {
    const tenantId = currentTenantId();
    if (!tenantId) {
      throw new AppError({
        code: ErrorCodes.TENANT_REQUIRED,
        message: 'Tenant requerido',
        status: 400,
      });
    }

    const fecha = normalizeDateToYMD(dto.fecha);

    if (!dto.cabezas || dto.cabezas < 1) {
      throw new AppError({
        code: ErrorCodes.EVENTO_MUERTE_INVALID,
        message: 'cabezas inválido (debe ser >= 1)',
        status: 400,
        details: { cabezas: dto.cabezas },
      });
    }

    return this.dataSource.transaction(async (manager) => {
      // 1) validar tropa tenant-safe
      const tQb = manager.getRepository(Tropa).createQueryBuilder('t');
      applyTenantScope(tQb, 't');
      tQb.andWhere('t.id = :id', { id: dto.tropaId });
      tQb.andWhere('t.deleted_at IS NULL');
      const tropa = await tQb.getOne();

      if (!tropa) {
        throw new AppError({
          code: ErrorCodes.TROPA_NOT_FOUND,
          message: 'Tropa no encontrada',
          status: 404,
          details: { id: dto.tropaId },
        });
      }

      if (tropa.estado === EstadoTropa.CERRADA) {
        throw new AppError({
          code: ErrorCodes.TROPA_CERRADA_NO_EVENTOS,
          message: 'La tropa está cerrada; no se pueden registrar muertes',
          status: 400,
          details: { tropaId: dto.tropaId },
        });
      }

      // 2) descuento atómico (evita race)
      const upd = await manager
        .getRepository(Tropa)
        .createQueryBuilder()
        .update()
        .set({
          cabezasActuales: () => `"cabezas_actuales" - ${dto.cabezas}`,
        } as any)
        .where('id = :id', { id: dto.tropaId })
        .andWhere('deleted_at IS NULL')
        .andWhere('"cabezas_actuales" >= :c', { c: dto.cabezas })
        .execute();

      if (!upd.affected) {
        throw new AppError({
          code: ErrorCodes.TROPA_CABEZAS_INSUFICIENTES,
          message:
            'No hay suficientes cabezas en la tropa para registrar esa muerte',
          status: 400,
          details: { tropaId: dto.tropaId, cabezas: dto.cabezas },
        });
      }

      // 3) crear evento
      const evRepo = manager.getRepository(EventoMuerte);
      const ev = await evRepo.save(
        evRepo.create({
          tenant_id: tenantId,
          tropaId: dto.tropaId,
          fecha,
          cabezas: dto.cabezas,
          notas: dto.notas ?? null,
        } as any),
      );

      return ev;
    });
  }

  // =========================================================
  // SOFT DELETE (revierte cabezas + soft delete)
  // =========================================================
  async softDeleteOne(id: string) {
    return this.dataSource.transaction(async (manager) => {
      // buscar evento (tenant-safe)
      const qb = manager.getRepository(EventoMuerte).createQueryBuilder('e');
      applyTenantScope(qb, 'e');
      qb.andWhere('e.id = :id', { id });
      qb.andWhere('e.deleted_at IS NULL');
      const ev = await qb.getOne();

      if (!ev) {
        throw new AppError({
          code: ErrorCodes.EVENTO_MUERTE_NOT_FOUND,
          message: 'Evento de muerte no encontrado',
          status: 404,
          details: { id },
        });
      }

      // revertir cabezas (suma)
      await manager
        .getRepository(Tropa)
        .createQueryBuilder()
        .update()
        .set({
          cabezasActuales: () => `"cabezas_actuales" + ${ev.cabezas}`,
        } as any)
        .where('id = :id', { id: ev.tropaId })
        .andWhere('deleted_at IS NULL')
        .execute();

      // soft delete evento
      await manager
        .getRepository(EventoMuerte)
        .softDelete({ id: ev.id } as any);

      return true;
    });
  }

  // =========================================================
  // RESTORE (vuelve a descontar cabezas + restore)
  // =========================================================
  async restoreOne(id: string) {
    return this.dataSource.transaction(async (manager) => {
      // traer evento incluyendo deleted
      const qb = manager.getRepository(EventoMuerte).createQueryBuilder('e');
      applyTenantScope(qb, 'e');
      qb.andWhere('e.id = :id', { id });
      qb.withDeleted();
      const ev = await qb.getOne();

      if (!ev) {
        throw new AppError({
          code: ErrorCodes.EVENTO_MUERTE_NOT_FOUND,
          message: 'Evento de muerte no encontrado',
          status: 404,
          details: { id },
        });
      }

      if (!ev.deleted_at) {
        // ya estaba activo
        return true;
      }

      // validar tropa ABIERTA
      const tQb = manager.getRepository(Tropa).createQueryBuilder('t');
      applyTenantScope(tQb, 't');
      tQb.andWhere('t.id = :id', { id: ev.tropaId });
      tQb.andWhere('t.deleted_at IS NULL');
      const tropa = await tQb.getOne();

      if (!tropa) {
        throw new AppError({
          code: ErrorCodes.TROPA_NOT_FOUND,
          message: 'Tropa no encontrada',
          status: 404,
          details: { id: ev.tropaId },
        });
      }

      if (tropa.estado === EstadoTropa.CERRADA) {
        throw new AppError({
          code: ErrorCodes.TROPA_CERRADA_NO_EVENTOS,
          message: 'La tropa está cerrada; no se puede restaurar el evento',
          status: 400,
          details: { tropaId: ev.tropaId, eventoId: ev.id },
        });
      }

      // descuento atómico (no puede quedar negativo)
      const upd = await manager
        .getRepository(Tropa)
        .createQueryBuilder()
        .update()
        .set({
          cabezasActuales: () => `"cabezas_actuales" - ${ev.cabezas}`,
        } as any)
        .where('id = :id', { id: ev.tropaId })
        .andWhere('deleted_at IS NULL')
        .andWhere('"cabezas_actuales" >= :c', { c: ev.cabezas })
        .execute();

      if (!upd.affected) {
        throw new AppError({
          code: ErrorCodes.TROPA_CABEZAS_INSUFICIENTES,
          message:
            'No hay suficientes cabezas para restaurar el evento de muerte',
          status: 400,
          details: { tropaId: ev.tropaId, cabezas: ev.cabezas },
        });
      }

      await manager.getRepository(EventoMuerte).restore({ id: ev.id } as any);
      return true;
    });
  }

  private handleDbErrors(e: unknown): never {
    if (e instanceof QueryFailedError) {
      throw new AppError({
        code: ErrorCodes.INTERNAL,
        message: 'Error de base de datos',
        status: 500,
        details: { dbMessage: (e as any)?.message },
      });
    }
    throw e as any;
  }
}
