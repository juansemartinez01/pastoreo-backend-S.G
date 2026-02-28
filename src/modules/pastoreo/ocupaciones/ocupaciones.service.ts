// src/modules/pastoreo/ocupaciones/ocupaciones.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, DeepPartial, QueryFailedError, Repository } from 'typeorm';

import { BaseCrudTenantService } from '../../../common/crud/base-crud.service';
import { AppError } from '../../../common/errors/app-error';
import { ErrorCodes } from '../../../common/errors/error-codes';
import { applyTenantScope } from '../../../common/tenancy/apply-tenant-scope';

import { Ocupacion } from './entities/ocupacion.entity';
import { OcupacionTropa } from './entities/ocupacion-tropa.entity';
import { EstadoOcupacion } from './entities/ocupacion.types';

import { CreateOcupacionDto } from './dto/create-ocupacion.dto';
import { ConfirmarMovimientoDto } from './dto/confirmar-movimiento.dto';

// Ajustá estos imports a tu estructura real
import { Lote } from '../../maestros/lotes/entities/lote.entity';
import { Tropa } from '../../ganaderia/tropas/entities/tropa.entity';
import { Pastura } from '../../maestros/pasturas/entities/pastura.entity';

type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

@Injectable()
export class OcupacionesService extends BaseCrudTenantService<Ocupacion> {
  constructor(
    @InjectRepository(Ocupacion) repo: Repository<Ocupacion>,
    @InjectRepository(OcupacionTropa)
    private readonly otRepo: Repository<OcupacionTropa>,
    @InjectRepository(Lote) private readonly loteRepo: Repository<Lote>,
    @InjectRepository(Tropa) private readonly tropaRepo: Repository<Tropa>,
    @InjectRepository(Pastura)
    private readonly pasturaRepo: Repository<Pastura>,
    private readonly dataSource: DataSource,
  ) {
    super(repo);
  }

  async listOcupaciones(q: any) {
    const normalized = { ...q, q: q.q ?? q.search ?? undefined };

    return super.list(normalized, {
      alias: 'o',
      strictTenant: true,
      allowGlobal: false,
      searchColumns: ['notas'],
      sortAllowed: [
        'fechaDesde',
        'fechaHasta',
        'estado',
        'created_at',
        'updated_at',
      ],
      sortFallback: { by: 'fechaDesde', order: 'DESC' },
      filterAllowed: ['estado', 'loteId'],
    });
  }

  async getOneOrFail(id: string) {
    const row = await super.findById(id, {
      strictTenant: true,
      allowGlobal: false,
    });
    if (!row) {
      throw new AppError({
        code: ErrorCodes.OCUPACION_NOT_FOUND,
        message: 'Ocupación no encontrada',
        status: 404,
        details: { id },
      });
    }
    return row;
  }

  async getDetalle(id: string) {
    await this.getOneOrFail(id);

    const qb = this.otRepo.createQueryBuilder('ot');
    applyTenantScope(qb, 'ot');
    qb.andWhere('ot.ocupacion_id = :id', { id });
    qb.andWhere('ot.deleted_at IS NULL');
    qb.orderBy('ot.created_at', 'ASC');
    const tropas = await qb.getMany();

    const ocupacion = await this.getOneOrFail(id);
    return { ocupacion, tropas };
  }

  async createOne(dto: CreateOcupacionDto) {
    if (!dto.tropas?.length) {
      throw new AppError({
        code: ErrorCodes.OCUPACION_TROPAS_REQUIRED,
        message: 'La ocupación debe incluir al menos 1 tropa',
        status: 400,
      });
    }

    return this.dataSource.transaction(async (manager) => {
      // 1) Lote existe + no NO_DISPONIBLE
      const lote = await this.findTenantSafe(
        manager.getRepository(Lote),
        'l',
        dto.loteId,
      );
      if ((lote as any).estado_manual === 'NO_DISPONIBLE') {
        throw new AppError({
          code: ErrorCodes.LOTE_NO_DISPONIBLE,
          message: 'El lote está NO_DISPONIBLE, no se puede crear ocupación',
          status: 400,
          details: { loteId: dto.loteId },
        });
      }

      // 2) Validar pastura snapshot (si viene)
      if (dto.pasturaIdSnapshot) {
        await this.ensureExistsTenantSafe(
          manager.getRepository(Pastura),
          'p',
          dto.pasturaIdSnapshot,
          ErrorCodes.PASTURA_NOT_FOUND,
          'Pastura no encontrada',
        );
      }

      // 3) Validar tropas existen + consistencia mínima
      for (const t of dto.tropas) {
        await this.ensureExistsTenantSafe(
          manager.getRepository(Tropa),
          't',
          t.tropaId,
          ErrorCodes.TROPA_NOT_FOUND,
          'Tropa no encontrada',
        );
        if (t.peso_inicio <= 0) {
          throw new AppError({
            code: ErrorCodes.OCUPACION_PESO_INICIO_REQUIRED,
            message: 'peso_inicio es obligatorio y debe ser > 0',
            status: 400,
            details: { tropaId: t.tropaId },
          });
        }
        if (t.cabezas_inicio < 1) {
          throw new AppError({
            code: ErrorCodes.OCUPACION_CABEZAS_INVALID,
            message: 'cabezas_inicio debe ser >= 1',
            status: 400,
            details: { tropaId: t.tropaId },
          });
        }
      }

      // 4) Crear ocupación (si ya hay una ABIERTA en el lote, caerá por unique)
      try {
        const ocRepo = manager.getRepository(Ocupacion);

        const ocupacionEntity = ocRepo.create({
          loteId: dto.loteId,
          fechaDesde: dto.fecha_desde,
          fechaHasta: null,
          estado: EstadoOcupacion.ABIERTA,
          pasturaIdSnapshot:
            dto.pasturaIdSnapshot ?? (lote as any).pastura_actual_id ?? null,
          notas: dto.notas ?? null,
        } satisfies DeepPartial<Ocupacion>);

        const ocupacion = await ocRepo.save(ocupacionEntity);

        // 5) Crear ocupacion_tropas
        const otRepo = manager.getRepository(OcupacionTropa);

        const rows = dto.tropas.map((x) =>
          otRepo.create({
            ocupacionId: ocupacion.id,
            tropaId: x.tropaId,
            cabezasInicio: x.cabezas_inicio,
            cabezasFin: null,
            pesoInicio: String(x.peso_inicio),
            pesoFin: null,
            aumentoDiario: String(x.aumento_diario ?? 0),
            factorEngorde: String(x.factor_engorde ?? 0),
          } satisfies DeepPartial<OcupacionTropa>),
        );

        await otRepo.save(rows); // rows es OcupacionTropa[]

        // 6) Estado lote -> OCUPADO (automático)
        await manager
          .getRepository(Lote)
          .createQueryBuilder()
          .update()
          .set({ estado_manual: 'OCUPADO' } as any)
          .where('id = :id', { id: dto.loteId })
          .execute();

        return ocupacion;
      } catch (e) {
        this.handleDbErrors(e);
      }
    });
  }

  async confirmarMovimiento(id: string, dto: ConfirmarMovimientoDto) {
    return this.dataSource.transaction(async (manager) => {
      const ocup = await this.getOneOrFail(id);

      if (ocup.estado !== EstadoOcupacion.ABIERTA) {
        throw new AppError({
          code: ErrorCodes.OCUPACION_NOT_OPEN,
          message: 'La ocupación no está ABIERTA',
          status: 400,
          details: { id },
        });
      }

      // validar fecha_hasta >= fecha_desde
      if (dto.fecha_hasta < ocup.fechaDesde) {
        throw new AppError({
          code: ErrorCodes.OCUPACION_FECHAS_INVALID,
          message: 'fecha_hasta no puede ser menor a fecha_desde',
          status: 400,
          details: { desde: ocup.fechaDesde, hasta: dto.fecha_hasta },
        });
      }

      // cargar tropas existentes
      const qb = manager.getRepository(OcupacionTropa).createQueryBuilder('ot');
      applyTenantScope(qb, 'ot');
      qb.andWhere('ot.ocupacion_id = :id', { id });
      qb.andWhere('ot.deleted_at IS NULL');
      const rows = await qb.getMany();

      // map por tropaId para exigir Pf
      const incoming = new Map(dto.tropas.map((x) => [x.tropaId, x]));
      for (const r of rows) {
        const inp = incoming.get(r.tropaId);
        if (!inp) {
          throw new AppError({
            code: ErrorCodes.OCUPACION_PESO_FIN_REQUIRED,
            message: 'Faltan datos de cierre para una tropa de la ocupación',
            status: 400,
            details: { tropaId: r.tropaId },
          });
        }
        if (!inp.peso_fin || inp.peso_fin <= 0) {
          throw new AppError({
            code: ErrorCodes.OCUPACION_PESO_FIN_REQUIRED,
            message: 'peso_fin es obligatorio y debe ser > 0',
            status: 400,
            details: { tropaId: r.tropaId },
          });
        }
      }

      // actualizar ocupación -> CERRADA
      await manager.getRepository(Ocupacion).update(
        { id: ocup.id } as any,
        {
          fechaHasta: dto.fecha_hasta,
          estado: EstadoOcupacion.CERRADA,
        } as any,
      );

      // actualizar ocupacion_tropas
      for (const r of rows) {
        const inp = incoming.get(r.tropaId)!;
        await manager.getRepository(OcupacionTropa).update(
          { id: r.id } as any,
          {
            cabezasFin: inp.cabezas_fin,
            pesoFin: String(inp.peso_fin),
          } as any,
        );
      }

      // estado lote al cerrar (default DESCANSO)
      const estado = dto.estadoLoteAlCerrar ?? 'DESCANSO';
      await manager
        .getRepository(Lote)
        .createQueryBuilder()
        .update()
        .set({ estado_manual: estado } as any)
        .where('id = :id', { id: ocup.loteId })
        .execute();

      return true;
    });
  }

  async cerrar(id: string, dto: ConfirmarMovimientoDto) {
    // hoy cerrar = confirmarMovimiento (misma lógica)
    return this.confirmarMovimiento(id, dto);
  }

  // =========================================================
  // Helpers
  // =========================================================

  private async findTenantSafe(
    repo: Repository<any>,
    alias: string,
    id: string,
  ) {
    const qb = repo.createQueryBuilder(alias);
    applyTenantScope(qb, alias);
    qb.andWhere(`${alias}.id = :id`, { id });
    qb.andWhere(`${alias}.deleted_at IS NULL`);
    const row = await qb.getOne();
    if (!row) return null;
    return row;
  }

  private async ensureExistsTenantSafe(
    repo: Repository<any>,
    alias: string,
    id: string,
    code: ErrorCode,
    message: string,
  ) {
    const qb = repo.createQueryBuilder(alias);
    applyTenantScope(qb, alias);
    qb.andWhere(`${alias}.id = :id`, { id });
    qb.andWhere(`${alias}.deleted_at IS NULL`);
    const row = await qb.getOne();
    if (!row) {
      throw new AppError({ code, message, status: 404, details: { id } });
    }
  }

  private handleDbErrors(e: unknown): never {
    if (e instanceof QueryFailedError) {
      const msg = (e as any)?.message as string | undefined;
      const code = (e as any)?.code as string | undefined;

      if (code === '23505') {
        // unique ocupación abierta por lote
        throw new AppError({
          code: ErrorCodes.OCUPACION_DUPLICATE_OPEN_LOTE,
          message: 'Ya existe una ocupación ABIERTA para ese lote',
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
