// src/modules/agricultura/campanias/campanias.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, QueryFailedError, Repository } from 'typeorm';

import { BaseCrudTenantService } from '../../../common/crud/base-crud.service';
import { AppError } from '../../../common/errors/app-error';
import { ErrorCodes } from '../../../common/errors/error-codes';
import { applyTenantScope } from '../../../common/tenancy/apply-tenant-scope';

import { AuditService } from '../../audit/audit.service';
import { tenantContext } from '../../tenancy/tenant-context';

import { Campania, EstadoCampania } from './entities/campania.entity';
import { CampaniaEstadoHistorial } from './entities/campania-estado-historial.entity';
import { Lote } from '../../maestros/lotes/entities/lote.entity';
import { Pastura } from '../../maestros/pasturas/entities/pastura.entity';

import { CreateCampaniaDto } from './dto/create-campania.dto';
import { UpdateCampaniaDto } from './dto/update-campania.dto';
import { ChangeCampaniaStateDto } from './dto/change-campania-state.dto';
import { CerrarCampaniaDto } from './dto/cerrar-campania.dto';

type Actor = { userId?: string; email?: string; requestId?: string };

function currentTenantId(): string | null {
  const store = (tenantContext as any).getStore?.();
  const t = store?.tenantId ?? null;
  return t ? String(t) : null;
}

@Injectable()
export class CampaniasService extends BaseCrudTenantService<Campania> {
  constructor(
    @InjectRepository(Campania)
    repo: Repository<Campania>,
    @InjectRepository(CampaniaEstadoHistorial)
    private readonly histRepo: Repository<CampaniaEstadoHistorial>,
    @InjectRepository(Lote)
    private readonly loteRepo: Repository<Lote>,
    @InjectRepository(Pastura)
    private readonly pasturaRepo: Repository<Pastura>,
    private readonly ds: DataSource,
    private readonly auditService: AuditService,
  ) {
    super(repo);
  }

  async listCampanias(q: any) {
    const page = Number(q.page ?? 1);
    const limit = Math.min(Number(q.limit ?? 20), 200);
    const skip = (page - 1) * limit;

    const qb = this.repo.createQueryBuilder('c');
    applyTenantScope(qb, 'c');

    qb.leftJoinAndSelect('c.lote', 'l');
    qb.leftJoinAndSelect('c.pastura', 'p');

    if (q.loteId) {
      qb.andWhere('c.lote_id = :loteId', { loteId: q.loteId });
    }

    if (q.pasturaId) {
      qb.andWhere('c.pastura_id = :pasturaId', { pasturaId: q.pasturaId });
    }

    if (q.estadoActual) {
      qb.andWhere('c.estado_actual = :estado', { estado: q.estadoActual });
    }

    if (q.abierta === 'true') {
      qb.andWhere('c.estado_actual <> :cerrada', {
        cerrada: EstadoCampania.CERRADA,
      });
    }

    if (q.abierta === 'false') {
      qb.andWhere('c.estado_actual = :cerrada', {
        cerrada: EstadoCampania.CERRADA,
      });
    }

    const search = q.q ?? q.search;
    if (search) {
      qb.andWhere(
        `(c.nombre ILIKE :s OR c.notas ILIKE :s OR l.nombre ILIKE :s OR p.nombre ILIKE :s)`,
        { s: `%${search}%` },
      );
    }

    const sortBy = q.sortBy ?? 'created_at';
    const sortOrder =
      String(q.sortOrder ?? 'DESC').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const sortMap: Record<string, string> = {
      nombre: 'c.nombre',
      fechaInicio: 'c.fecha_inicio',
      fechaCierre: 'c.fecha_cierre',
      estadoActual: 'c.estado_actual',
      created_at: 'c.created_at',
      updated_at: 'c.updated_at',
    };

    qb.orderBy(sortMap[sortBy] ?? 'c.created_at', sortOrder as any);
    qb.skip(skip).take(limit);

    const [items, total] = await qb.getManyAndCount();

    return { items, total, page, limit };
  }

  async getOneOrFail(id: string) {
    const qb = this.repo.createQueryBuilder('c');
    applyTenantScope(qb, 'c');

    qb.leftJoinAndSelect('c.lote', 'l');
    qb.leftJoinAndSelect('c.pastura', 'p');
    qb.andWhere('c.id = :id', { id });

    const row = await qb.getOne();

    if (!row) {
      throw new AppError({
        code: ErrorCodes.CAMPANIA_NOT_FOUND,
        message: 'Campaña no encontrada',
        status: 404,
        details: { id },
      });
    }

    const resumenEstados = await this.getResumenDiasPorEstado(id);

    return {
      ...row,
      resumenEstados,
    };
  }

  async createOne(dto: CreateCampaniaDto, actor: Actor) {
    const lote = await this.ensureLoteExists(dto.loteId);
    const pastura = await this.ensurePasturaExists(dto.pasturaId);

    const estadoInicial = dto.estadoActual ?? EstadoCampania.BORRADOR;
    this.ensureValidInitialState(estadoInicial);

    await this.ensureNoOpenCampaniaForLote(dto.loteId);

    try {
      const created = await super.create(
        {
          loteId: dto.loteId,
          pasturaId: dto.pasturaId,
          nombre: dto.nombre,
          fechaInicio: dto.fechaInicio,
          estadoActual: estadoInicial,
          notas: dto.notas ?? null,
          loteNombreSnapshot: lote.nombre,
          pasturaNombreSnapshot: pastura.nombre,
          hectareasSnapshot: String(lote.hectareas),
          fechaCierre: null,
          totalGastosArs: '0',
          totalGastosUsd: '0',
          totalIngresosArs: '0',
          totalIngresosUsd: '0',
          resultadoArs: '0',
          resultadoUsd: '0',
          resumenCierre: null,
        } as any,
        { strictTenant: true, allowGlobal: false },
      );

      await this.openEstadoHistorial(
        created.id,
        estadoInicial,
        dto.fechaInicio,
        actor,
        'Estado inicial de campaña',
      );

      await this.writeAudit('CAMPANIA_CREATE', actor, {
        campania_id: created.id,
        lote_id: created.loteId,
        pastura_id: created.pasturaId,
        nombre: created.nombre,
        estado_actual: created.estadoActual,
        fecha_inicio: created.fechaInicio,
      });

      return this.getOneOrFail(created.id);
    } catch (e) {
      this.handleDbErrors(e);
    }
  }

  async updateOne(id: string, dto: UpdateCampaniaDto, actor: Actor) {
    const prev = await this.getOneBaseOrFail(id);

    if (prev.estadoActual === EstadoCampania.CERRADA) {
      throw new AppError({
        code: ErrorCodes.CAMPANIA_CERRADA,
        message: 'La campaña está cerrada y no puede modificarse',
        status: 409,
        details: { id },
      });
    }

    let loteSnapshot = {
      loteNombreSnapshot: prev.loteNombreSnapshot,
      hectareasSnapshot: prev.hectareasSnapshot,
    };

    let pasturaSnapshot = {
      pasturaNombreSnapshot: prev.pasturaNombreSnapshot,
    };

    if (dto.loteId && dto.loteId !== prev.loteId) {
      await this.ensureNoOpenCampaniaForLote(dto.loteId, id);
      const lote = await this.ensureLoteExists(dto.loteId);
      loteSnapshot = {
        loteNombreSnapshot: lote.nombre,
        hectareasSnapshot: String(lote.hectareas),
      };
    }

    if (dto.pasturaId !== undefined && dto.pasturaId !== prev.pasturaId) {
      if (prev.estadoActual !== EstadoCampania.BORRADOR) {
        throw new AppError({
          code: ErrorCodes.CAMPANIA_PASTURA_LOCKED,
          message:
            'La pastura solo puede modificarse mientras la campaña esté en BORRADOR',
          status: 409,
          details: { id, estadoActual: prev.estadoActual },
        });
      }

      const pastura = await this.ensurePasturaExists(dto.pasturaId);
      pasturaSnapshot = {
        pasturaNombreSnapshot: pastura.nombre,
      };
    }

    try {
      const updated = await super.update(
        id,
        {
          ...(dto.loteId ? { loteId: dto.loteId } : {}),
          ...(dto.pasturaId ? { pasturaId: dto.pasturaId } : {}),
          ...(dto.nombre !== undefined ? { nombre: dto.nombre } : {}),
          ...(dto.fechaInicio !== undefined
            ? { fechaInicio: dto.fechaInicio }
            : {}),
          ...(dto.notas !== undefined ? { notas: dto.notas } : {}),
          ...loteSnapshot,
          ...pasturaSnapshot,
        } as any,
        { strictTenant: true, allowGlobal: false },
      );

      await this.writeAudit('CAMPANIA_UPDATE', actor, {
        campania_id: id,
        cambios: dto,
      });

      return this.getOneOrFail(updated.id);
    } catch (e) {
      this.handleDbErrors(e);
    }
  }

  async changeState(id: string, dto: ChangeCampaniaStateDto, actor: Actor) {
    const camp = await this.getOneBaseOrFail(id);

    if (camp.estadoActual === EstadoCampania.CERRADA) {
      throw new AppError({
        code: ErrorCodes.CAMPANIA_CERRADA,
        message: 'La campaña ya está cerrada',
        status: 409,
        details: { id },
      });
    }

    if (dto.nuevoEstado === EstadoCampania.CERRADA) {
      throw new AppError({
        code: ErrorCodes.CAMPANIA_INVALID_TRANSITION,
        message:
          'Para cerrar una campaña debe utilizarse el endpoint específico de cierre',
        status: 400,
        details: { id },
      });
    }

    this.ensureValidTransition(camp.estadoActual, dto.nuevoEstado);

    const fechaCambio = dto.fechaCambio ?? this.todayIso();
    const fechaHastaAnterior = this.addDays(fechaCambio, -1);

    if (fechaCambio < camp.fechaInicio) {
      throw new AppError({
        code: ErrorCodes.CAMPANIA_FECHA_CAMBIO_INVALID,
        message:
          'La fecha de cambio no puede ser menor a la fecha de inicio de la campaña',
        status: 400,
        details: {
          fechaInicio: camp.fechaInicio,
          fechaCambio,
        },
      });
    }

    await this.ds.transaction(async (manager) => {
      await manager
        .getRepository(Campania)
        .update(
          { id, tenant_id: currentTenantId() as any } as any,
          { estadoActual: dto.nuevoEstado } as any,
        );

      await this.closeCurrentHistorial(manager, id, fechaCambio, actor);

      await manager.getRepository(CampaniaEstadoHistorial).save(
        manager.getRepository(CampaniaEstadoHistorial).create({
          tenant_id: currentTenantId(),
          campaniaId: id,
          estado: dto.nuevoEstado,
          fechaDesde: fechaCambio,
          fechaHasta: null,
          observaciones: dto.observaciones ?? null,
          actorUserId: actor.userId ?? null,
          actorEmail: actor.email ?? null,
          requestId: actor.requestId ?? null,
        } as any),
      );
    });

    await this.writeAudit('CAMPANIA_STATE_CHANGE', actor, {
      campania_id: id,
      from: camp.estadoActual,
      to: dto.nuevoEstado,
      fecha_cambio: fechaCambio,
      observaciones: dto.observaciones ?? null,
    });

    return this.getOneOrFail(id);
  }
  addDays(fecha: string, dias: number): string {
    const [y, m, d] = fecha.split('-').map(Number);
    const date = new Date(Date.UTC(y, m - 1, d));
    date.setUTCDate(date.getUTCDate() + dias);

    return date.toISOString().slice(0, 10);
  }

  async cerrarCampania(id: string, dto: CerrarCampaniaDto, actor: Actor) {
    const camp = await this.getOneBaseOrFail(id);

    if (camp.estadoActual === EstadoCampania.CERRADA) {
      throw new AppError({
        code: ErrorCodes.CAMPANIA_CERRADA,
        message: 'La campaña ya está cerrada',
        status: 409,
        details: { id },
      });
    }

    const fechaCierre = dto.fechaCierre ?? this.todayIso();

    if (fechaCierre < camp.fechaInicio) {
      throw new AppError({
        code: ErrorCodes.CAMPANIA_FECHA_CIERRE_INVALID,
        message: 'La fecha de cierre no puede ser menor a la fecha de inicio',
        status: 400,
        details: { fechaInicio: camp.fechaInicio, fechaCierre },
      });
    }

    const balance = await this.buildBalance(id);

    await this.ds.transaction(async (manager) => {
      await manager.getRepository(Campania).update(
        { id, tenant_id: currentTenantId() as any } as any,
        {
          estadoActual: EstadoCampania.CERRADA,
          fechaCierre,
          totalGastosArs: String(balance.totalGastosArs.toFixed(4)),
          totalGastosUsd: String(balance.totalGastosUsd.toFixed(4)),
          totalIngresosArs: String(balance.totalIngresosArs.toFixed(4)),
          totalIngresosUsd: String(balance.totalIngresosUsd.toFixed(4)),
          resultadoArs: String(balance.resultadoArs.toFixed(4)),
          resultadoUsd: String(balance.resultadoUsd.toFixed(4)),
          resumenCierre: {
            fecha_cierre: fechaCierre,
            observaciones: dto.observaciones ?? null,
            ...balance,
          },
        } as any,
      );

      await this.closeCurrentHistorial(manager, id, fechaCierre, actor);

      await manager.getRepository(CampaniaEstadoHistorial).save(
        manager.getRepository(CampaniaEstadoHistorial).create({
          tenant_id: currentTenantId(),
          campaniaId: id,
          estado: EstadoCampania.CERRADA,
          fechaDesde: fechaCierre,
          fechaHasta: fechaCierre,
          observaciones: dto.observaciones ?? 'Cierre de campaña',
          actorUserId: actor.userId ?? null,
          actorEmail: actor.email ?? null,
          requestId: actor.requestId ?? null,
        } as any),
      );
    });

    await this.writeAudit('CAMPANIA_CLOSE', actor, {
      campania_id: id,
      fecha_cierre: fechaCierre,
      observaciones: dto.observaciones ?? null,
      balance,
    });

    return this.getOneOrFail(id);
  }

  async softDeleteOne(id: string) {
    const row = await this.getOneBaseOrFail(id);

    if (row.estadoActual !== EstadoCampania.BORRADOR) {
      throw new AppError({
        code: ErrorCodes.CAMPANIA_DELETE_ONLY_BORRADOR,
        message: 'Solo se puede eliminar una campaña en estado BORRADOR',
        status: 409,
        details: { id, estadoActual: row.estadoActual },
      });
    }

    const ok = await super.softDelete(id, {
      strictTenant: true,
      allowGlobal: false,
    });

    if (!ok) {
      throw new AppError({
        code: ErrorCodes.CAMPANIA_NOT_FOUND,
        message: 'Campaña no encontrada',
        status: 404,
        details: { id },
      });
    }

    return true;
  }

  async restoreOne(id: string) {
    const row = await this.findById(id, {
      strictTenant: true,
      allowGlobal: false,
      withDeleted: true,
    } as any);

    if (!row) {
      throw new AppError({
        code: ErrorCodes.CAMPANIA_NOT_FOUND,
        message: 'Campaña no encontrada',
        status: 404,
        details: { id },
      });
    }

    if (row.estadoActual !== EstadoCampania.CERRADA) {
      await this.ensureNoOpenCampaniaForLote(row.loteId, row.id);
    }

    const ok = await super.restore(id, {
      strictTenant: true,
      allowGlobal: false,
    });

    if (!ok) {
      throw new AppError({
        code: ErrorCodes.CAMPANIA_NOT_FOUND,
        message: 'Campaña no encontrada',
        status: 404,
        details: { id },
      });
    }

    return true;
  }

  async getHistorialEstados(campaniaId: string) {
    await this.getOneBaseOrFail(campaniaId);

    const qb = this.histRepo.createQueryBuilder('h');
    applyTenantScope(qb, 'h');
    qb.andWhere('h.campania_id = :id', { id: campaniaId });
    qb.orderBy('h.fecha_desde', 'ASC');

    const rows = await qb.getMany();

    return rows.map((r) => ({
      ...r,
      dias: this.diffDaysInclusive(
        r.fechaDesde,
        r.fechaHasta ?? this.todayIso(),
      ),
    }));
  }

  async getResumenDiasPorEstado(campaniaId: string) {
    const rows = await this.getHistorialEstados(campaniaId);

    const map: Record<string, number> = {};

    for (const row of rows) {
      map[row.estado] = (map[row.estado] ?? 0) + row.dias;
    }

    return Object.entries(map).map(([estado, dias]) => ({ estado, dias }));
  }

  async getCampaniaActivaByLote(loteId: string) {
    const qb = this.repo.createQueryBuilder('c');
    applyTenantScope(qb, 'c');

    qb.leftJoinAndSelect('c.lote', 'l');
    qb.leftJoinAndSelect('c.pastura', 'p');

    qb.andWhere('c.lote_id = :loteId', { loteId });
    qb.andWhere('c.estado_actual <> :cerrada', {
      cerrada: EstadoCampania.CERRADA,
    });

    const row = await qb.getOne();
    return row ?? null;
  }

  private async getOneBaseOrFail(id: string) {
    const row = await super.findById(id, {
      strictTenant: true,
      allowGlobal: false,
    });

    if (!row) {
      throw new AppError({
        code: ErrorCodes.CAMPANIA_NOT_FOUND,
        message: 'Campaña no encontrada',
        status: 404,
        details: { id },
      });
    }

    return row;
  }

  private async ensureLoteExists(id: string) {
    const qb = this.loteRepo.createQueryBuilder('l');
    applyTenantScope(qb, 'l');
    qb.andWhere('l.id = :id', { id });
    qb.andWhere('l.deleted_at IS NULL');

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

  private async ensurePasturaExists(id: string) {
    const qb = this.pasturaRepo.createQueryBuilder('p');
    applyTenantScope(qb, 'p');
    qb.andWhere('p.id = :id', { id });
    qb.andWhere('p.deleted_at IS NULL');

    const row = await qb.getOne();

    if (!row) {
      throw new AppError({
        code: ErrorCodes.PASTURA_NOT_FOUND,
        message: 'Pastura no encontrada',
        status: 404,
        details: { id },
      });
    }

    return row;
  }

  private ensureValidInitialState(estado: EstadoCampania) {
    const allowed = [EstadoCampania.BORRADOR, EstadoCampania.DISPONIBLE];
    if (!allowed.includes(estado)) {
      throw new AppError({
        code: ErrorCodes.CAMPANIA_INVALID_INITIAL_STATE,
        message: 'Estado inicial inválido para la campaña',
        status: 400,
        details: { estado },
      });
    }
  }

  private ensureValidTransition(
    from: EstadoCampania,
    to: EstadoCampania,
  ): void {
    const transitions: Record<EstadoCampania, EstadoCampania[]> = {
      [EstadoCampania.BORRADOR]: [EstadoCampania.DISPONIBLE],
      [EstadoCampania.DISPONIBLE]: [EstadoCampania.IMPLANTADA],
      [EstadoCampania.IMPLANTADA]: [EstadoCampania.EN_CRECIMIENTO],
      [EstadoCampania.EN_CRECIMIENTO]: [EstadoCampania.LISTA],
      [EstadoCampania.LISTA]: [EstadoCampania.OCUPADA],
      [EstadoCampania.OCUPADA]: [EstadoCampania.DESCANSO],
      [EstadoCampania.DESCANSO]: [EstadoCampania.DISPONIBLE],
      [EstadoCampania.CERRADA]: [],
    };

    if (!transitions[from]?.includes(to)) {
      throw new AppError({
        code: ErrorCodes.CAMPANIA_INVALID_TRANSITION,
        message: 'Transición de estado inválida',
        status: 409,
        details: { from, to },
      });
    }
  }

  private async ensureNoOpenCampaniaForLote(
    loteId: string,
    excludeId?: string,
  ) {
    const qb = this.repo.createQueryBuilder('c');
    applyTenantScope(qb, 'c');

    qb.andWhere('c.lote_id = :loteId', { loteId });
    qb.andWhere('c.estado_actual <> :cerrada', {
      cerrada: EstadoCampania.CERRADA,
    });

    if (excludeId) {
      qb.andWhere('c.id <> :excludeId', { excludeId });
    }

    const exists = await qb.getOne();
    if (exists) {
      throw new AppError({
        code: ErrorCodes.CAMPANIA_LOTE_ALREADY_HAS_OPEN,
        message: 'El lote ya tiene una campaña abierta',
        status: 409,
        details: { loteId, campaniaId: exists.id },
      });
    }
  }

  private async openEstadoHistorial(
    campaniaId: string,
    estado: EstadoCampania,
    fechaDesde: string,
    actor: Actor,
    observaciones?: string,
  ) {
    await this.histRepo.save(
      this.histRepo.create({
        tenant_id: currentTenantId(),
        campaniaId,
        estado,
        fechaDesde,
        fechaHasta: null,
        observaciones: observaciones ?? null,
        actorUserId: actor.userId ?? null,
        actorEmail: actor.email ?? null,
        requestId: actor.requestId ?? null,
      } as any),
    );
  }

  private async closeCurrentHistorial(
    manager: any,
    campaniaId: string,
    fechaHasta: string,
    actor: Actor,
  ) {
    const qb = manager
      .getRepository(CampaniaEstadoHistorial)
      .createQueryBuilder('h');
    applyTenantScope(qb, 'h');
    qb.andWhere('h.campania_id = :id', { id: campaniaId });
    qb.andWhere('h.fecha_hasta IS NULL');
    qb.orderBy('h.fecha_desde', 'DESC');

    const current = await qb.getOne();
    if (!current) return;

    current.fechaHasta = fechaHasta;
    current.actorUserId = actor.userId ?? current.actorUserId ?? null;
    current.actorEmail = actor.email ?? current.actorEmail ?? null;
    current.requestId = actor.requestId ?? current.requestId ?? null;

    await manager.getRepository(CampaniaEstadoHistorial).save(current);
  }

  private diffDaysInclusive(desde: string, hasta: string): number {
    const a = new Date(`${desde}T00:00:00Z`).getTime();
    const b = new Date(`${hasta}T00:00:00Z`).getTime();
    const diff = Math.floor((b - a) / (1000 * 60 * 60 * 24));
    return diff + 1;
  }

  private todayIso(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private async buildBalance(campaniaId: string) {
    const tenantId = currentTenantId();
    if (!tenantId) {
      throw new AppError({
        code: ErrorCodes.TENANT_REQUIRED,
        message: 'Tenant requerido',
        status: 400,
      });
    }

    const gastosRows = await this.ds.query(
      `
    SELECT
      COALESCE(SUM(monto_ars), 0) AS total_ars,
      COALESCE(SUM(monto_usd), 0) AS total_usd
    FROM public.ag_gastos_campania
    WHERE tenant_id = $1
      AND campania_id = $2
      AND deleted_at IS NULL
    `,
      [tenantId, campaniaId],
    );

    const ingresosRows = await this.ds.query(
      `
    SELECT
      COALESCE(SUM(monto_ars), 0) AS total_ars,
      COALESCE(SUM(monto_usd), 0) AS total_usd
    FROM public.ag_ingresos_campania
    WHERE tenant_id = $1
      AND campania_id = $2
      AND deleted_at IS NULL
    `,
      [tenantId, campaniaId],
    );

    const gastos = gastosRows?.[0] ?? { total_ars: 0, total_usd: 0 };
    const ingresos = ingresosRows?.[0] ?? { total_ars: 0, total_usd: 0 };

    const totalGastosArs = Number(gastos.total_ars ?? 0);
    const totalGastosUsd = Number(gastos.total_usd ?? 0);
    const totalIngresosArs = Number(ingresos.total_ars ?? 0);
    const totalIngresosUsd = Number(ingresos.total_usd ?? 0);

    return {
      totalGastosArs,
      totalGastosUsd,
      totalIngresosArs,
      totalIngresosUsd,
      resultadoArs: totalIngresosArs - totalGastosArs,
      resultadoUsd: totalIngresosUsd - totalGastosUsd,
    };
  }

  private async writeAudit(action: string, actor: Actor, extra: any) {
    await this.auditService.write('admin', {
      tenant_id: currentTenantId(),
      request_id: actor.requestId ?? 'unknown',
      action,
      entity: 'Campania',
      actor_user_id: actor.userId ?? null,
      actor_email: actor.email ?? null,
      payload: {
        action,
        entity: 'Campania',
        extra,
      },
    });
  }

  private handleDbErrors(e: unknown): never {
    if (e instanceof QueryFailedError) {
      const msg = (e as any)?.message as string | undefined;
      const code = (e as any)?.code as string | undefined;

      if (code === '23505') {
        throw new AppError({
          code: ErrorCodes.CAMPANIA_DUPLICATE,
          message: 'Conflicto de unicidad al guardar la campaña',
          status: 409,
          details: { dbMessage: msg },
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
