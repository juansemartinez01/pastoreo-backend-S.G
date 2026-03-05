// src/modules/pastoreo/motor-consumo/motor-consumo.service.ts
import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

import { AppError } from '../../../common/errors/app-error';
import { ErrorCodes } from '../../../common/errors/error-codes';
import { applyTenantScope } from '../../../common/tenancy/apply-tenant-scope';
import { tenantContext } from '../../tenancy/tenant-context';

import { Ocupacion } from '../ocupaciones/entities/ocupacion.entity';
import { OcupacionTropa } from '../ocupaciones/entities/ocupacion-tropa.entity';
import { Pastura } from '../../maestros/pasturas/entities/pastura.entity';

import {
  Movimiento,
  AreaMovimiento,
  TipoMovimiento,
} from '../../movimientos/entities/movimiento.entity';
import { ConsumoCalculado } from './entities/consumo-calculado.entity';

// Ajustá si tus entidades se llaman distinto:
import { EventoMuerte } from '../../ganaderia/eventos-muerte/entities/evento-muerte.entity';
import { DivisionTropa } from '../../ganaderia/divisiones-tropa/entities/division-tropa.entity';

function currentTenantId(): string | null {
  const store = (tenantContext as any).getStore?.();
  const t = store?.tenantId ?? null;
  return t ? String(t) : null;
}

const REGLA_VERSION = 1;

@Injectable()
export class MotorConsumoService {
  constructor(
    private readonly dataSource: DataSource,

    @InjectRepository(Ocupacion)
    private readonly ocupRepo: Repository<Ocupacion>,
    @InjectRepository(OcupacionTropa)
    private readonly otRepo: Repository<OcupacionTropa>,
    @InjectRepository(Pastura)
    private readonly pasturaRepo: Repository<Pastura>,

    @InjectRepository(ConsumoCalculado)
    private readonly consRepo: Repository<ConsumoCalculado>,
    @InjectRepository(Movimiento)
    private readonly movRepo: Repository<Movimiento>,

    @InjectRepository(EventoMuerte)
    private readonly muerteRepo: Repository<EventoMuerte>,
    @InjectRepository(DivisionTropa)
    private readonly divRepo: Repository<DivisionTropa>,
  ) {}

  /**
   * Ejecuta (idempotente) el motor para una ocupación.
   * - Borra snapshots y movimientos previos (ALIMENTO_INTERNO)
   * - Recalcula y persiste todo
   */

  async recalcularParaOcupacion(ocupacionId: string, tipoCambio: number) {
    return this.dataSource.transaction((manager) =>
      this.recalcularParaOcupacionTx(manager, ocupacionId, tipoCambio),
    );
  }


  // async recalcularParaOcupacion(ocupacionId: string, tipoCambio: number) {
  //   const tenantId = currentTenantId();
  //   if (!tenantId) {
  //     throw new AppError({
  //       code: ErrorCodes.TENANT_REQUIRED,
  //       message: 'Tenant requerido',
  //       status: 400,
  //     });
  //   }
  //   if (!tipoCambio || tipoCambio <= 0 || Number.isNaN(tipoCambio)) {
  //     throw new AppError({
  //       code: ErrorCodes.TIPO_CAMBIO_INVALID,
  //       message: 'tipo_cambio inválido',
  //       status: 400,
  //       details: { tipoCambio },
  //     });
  //   }

  //   return this.dataSource.transaction(async (manager) => {
  //     // 1) ocupación + validar cerrada y con fechas
  //     const ocup = await this.findTenantSafe(
  //       manager.getRepository(Ocupacion),
  //       'o',
  //       ocupacionId,
  //     );
  //     if (!ocup) {
  //       throw new AppError({
  //         code: ErrorCodes.OCUPACION_NOT_FOUND,
  //         message: 'Ocupación no encontrada',
  //         status: 404,
  //         details: { id: ocupacionId },
  //       });
  //     }
  //     if (!ocup.fechaHasta) {
  //       throw new AppError({
  //         code: ErrorCodes.OCUPACION_FECHA_HASTA_REQUIRED,
  //         message: 'La ocupación debe tener fecha_hasta para calcular consumo',
  //         status: 400,
  //         details: { id: ocupacionId },
  //       });
  //     }

  //     const desde = ocup.fechaDesde;
  //     const hasta = ocup.fechaHasta;

  //     // 2) tropas de ocupación
  //     const qbOt = manager
  //       .getRepository(OcupacionTropa)
  //       .createQueryBuilder('ot');
  //     applyTenantScope(qbOt, 'ot');
  //     qbOt.andWhere('ot.ocupacion_id = :id', { id: ocupacionId });
  //     qbOt.andWhere('ot.deleted_at IS NULL');
  //     const ots = await qbOt.getMany();

  //     if (!ots.length) {
  //       throw new AppError({
  //         code: ErrorCodes.OCUPACION_TROPAS_REQUIRED,
  //         message: 'No hay tropas asociadas a la ocupación',
  //         status: 400,
  //         details: { ocupacionId },
  //       });
  //     }

  //     // 3) pastura snapshot (obligatoria para motor)
  //     const pasturaId = ocup.pasturaIdSnapshot;
  //     if (!pasturaId) {
  //       throw new AppError({
  //         code: ErrorCodes.OCUPACION_PASTURA_SNAPSHOT_REQUIRED,
  //         message:
  //           'La ocupación no tiene pastura snapshot, no se puede calcular',
  //         status: 400,
  //         details: { ocupacionId },
  //       });
  //     }

  //     const pastura = await this.findTenantSafe(
  //       manager.getRepository(Pastura),
  //       'p',
  //       pasturaId,
  //     );
  //     if (!pastura) {
  //       throw new AppError({
  //         code: ErrorCodes.PASTURA_NOT_FOUND,
  //         message: 'Pastura no encontrada',
  //         status: 404,
  //         details: { pasturaId },
  //       });
  //     }

  //     const precioArs = Number(pastura.precio_kg_ars);
  //     const precioUsd = Number(pastura.precio_kg_usd);

  //     // 4) Idempotencia: borrar snapshots y movimientos previos
  //     // snapshots por ocupación
  //     await manager
  //       .getRepository(ConsumoCalculado)
  //       .createQueryBuilder()
  //       .softDelete()
  //       .where('tenant_id = :t', { t: tenantId })
  //       .andWhere('ocupacion_id = :id', { id: ocupacionId })
  //       .execute();

  //     // movimientos alimento interno por ocupación
  //     await manager
  //       .getRepository(Movimiento)
  //       .createQueryBuilder()
  //       .softDelete()
  //       .where('tenant_id = :t', { t: tenantId })
  //       .andWhere('tipo = :tipo', { tipo: TipoMovimiento.ALIMENTO_INTERNO })
  //       .andWhere('source_type = :st', { st: 'OCUPACION' })
  //       .andWhere('source_id = :sid', { sid: ocupacionId })
  //       .execute();

  //     // 5) Calcular por tropa
  //     let totalKg = 0;

  //     for (const ot of ots) {
  //       const dias = this.daysInclusive(desde, hasta);

  //       const Pi = Number(ot.pesoInicio);
  //       const aumento = Number(ot.aumentoDiario);
  //       const factor = Number(ot.factorEngorde);

  //       // Pf estimado
  //       const Pf = Pi + dias * aumento;

  //       // consumo por cabeza (regla congelada)
  //       const consumoPorCabeza = ((Pi + Pf) / 2) * factor;

  //       // cabezas efectivas promedio durante la estadía
  //       const headsSum = await this.cabezasSumEnRango(
  //         manager,
  //         ot.tropaId,
  //         desde,
  //         hasta,
  //         ot.cabezasInicio,
  //       );
  //       const headsProm = headsSum / dias;

  //       const kg = consumoPorCabeza * headsProm;
  //       totalKg += kg;

  //       // snapshot
  //       await manager.getRepository(ConsumoCalculado).save(
  //         manager.getRepository(ConsumoCalculado).create({
  //           tenant_id: tenantId,
  //           ocupacionId,
  //           tropaId: ot.tropaId,
  //           fechaDesde: desde,
  //           fechaHasta: hasta,
  //           kgConsumidos: String(kg.toFixed(4)),
  //           precioKgArsSnapshot: String(precioArs.toFixed(4)),
  //           precioKgUsdSnapshot: String(precioUsd.toFixed(4)),
  //           tipoCambioSnapshot: String(tipoCambio.toFixed(6)),
  //           reglaVersion: REGLA_VERSION,
  //           datosBase: {
  //             regla_version: REGLA_VERSION,
  //             Pi,
  //             Pf,
  //             dias,
  //             aumento_diario: aumento,
  //             factor_engorde: factor,
  //             consumo_por_cabeza: consumoPorCabeza,
  //             cabezas_inicio: ot.cabezasInicio,
  //             cabezas_sum: headsSum,
  //             cabezas_prom: headsProm,
  //             pastura_id: pasturaId,
  //             precios: { ars: precioArs, usd: precioUsd },
  //             tipo_cambio: tipoCambio,
  //           },
  //         } as any),
  //       );
  //     }

  //     // 6) Movimientos internos (agregado por ocupación)
  //     const groupId = await this.uuid(manager);

  //     const montoUsd = totalKg * precioUsd;
  //     const montoArs = totalKg * precioArs;

  //     const fechaMov = hasta; // usamos fecha_hasta como fecha contable del movimiento

  //     const desc = `Alimento interno por ocupación ${ocupacionId} (${desde} a ${hasta})`;

  //     // AGRI ingreso (+)
  //     await manager.getRepository(Movimiento).save(
  //       manager.getRepository(Movimiento).create({
  //         tenant_id: tenantId,
  //         area: AreaMovimiento.AGRI,
  //         tipo: TipoMovimiento.ALIMENTO_INTERNO,
  //         sourceType: 'OCUPACION',
  //         sourceId: ocupacionId,
  //         groupId,
  //         fecha: fechaMov,
  //         montoArs: String(montoArs.toFixed(2)),
  //         montoUsd: String(montoUsd.toFixed(2)),
  //         tipoCambio: String(tipoCambio.toFixed(6)),
  //         descripcion: desc,
  //       } as any),
  //     );

  //     // GANA egreso (-)
  //     await manager.getRepository(Movimiento).save(
  //       manager.getRepository(Movimiento).create({
  //         tenant_id: tenantId,
  //         area: AreaMovimiento.GANA,
  //         tipo: TipoMovimiento.ALIMENTO_INTERNO,
  //         sourceType: 'OCUPACION',
  //         sourceId: ocupacionId,
  //         groupId,
  //         fecha: fechaMov,
  //         montoArs: String((-montoArs).toFixed(2)),
  //         montoUsd: String((-montoUsd).toFixed(2)),
  //         tipoCambio: String(tipoCambio.toFixed(6)),
  //         descripcion: desc,
  //       } as any),
  //     );

  //     return { totalKg: Number(totalKg.toFixed(4)), groupId };
  //   });
  // }

  // =========================
  // Cabezas efectivas
  // =========================

  private async cabezasSumEnRango(
    manager: any,
    tropaId: string,
    desde: string,
    hasta: string,
    cabezasInicio: number,
  ): Promise<number> {
    const dias = this.daysInclusive(desde, hasta);
    let sum = 0;

    for (let i = 0; i < dias; i++) {
      const d = this.addDays(desde, i);
      const cabezasDia = await this.cabezasEnFecha(
        manager,
        tropaId,
        d,
        cabezasInicio,
      );
      sum += cabezasDia;
    }

    return sum;
  }

  private async cabezasEnFecha(
    manager: any,
    tropaId: string,
    fecha: string,
    cabezasBase: number,
  ): Promise<number> {
    // muertes <= fecha (inclusive)
    const muertes = await manager
      .getRepository(EventoMuerte)
      .createQueryBuilder('m')
      .where('m.tropa_id = :t', { t: tropaId })
      .andWhere('m.fecha <= :f', { f: fecha })
      .andWhere('m.deleted_at IS NULL')
      .select('COALESCE(SUM(m.cabezas), 0)', 'sum')
      .getRawOne();

    const sumMuertes = Number(muertes?.sum ?? 0);

    // divisiones OUT (origen) <= fecha (inclusive)
    const divOut = await manager
      .getRepository(DivisionTropa)
      .createQueryBuilder('d')
      .where('d.tropa_origen_id = :t', { t: tropaId })
      .andWhere('d.fecha <= :f', { f: fecha })
      .andWhere('d.deleted_at IS NULL')
      .select('COALESCE(SUM(d.cabezas_transferidas), 0)', 'sum')
      .getRawOne();

    const sumOut = Number(divOut?.sum ?? 0);

    // divisiones IN (destino) <= fecha (inclusive)
    const divIn = await manager
      .getRepository(DivisionTropa)
      .createQueryBuilder('d')
      .where('d.tropa_destino_id = :t', { t: tropaId })
      .andWhere('d.fecha <= :f', { f: fecha })
      .andWhere('d.deleted_at IS NULL')
      .select('COALESCE(SUM(d.cabezas_transferidas), 0)', 'sum')
      .getRawOne();

    const sumIn = Number(divIn?.sum ?? 0);

    const res = cabezasBase - sumMuertes - sumOut + sumIn;
    return Math.max(0, res);
  }

  // =========================
  // Utils fechas
  // =========================

  private daysInclusive(desde: string, hasta: string): number {
    const a = new Date(desde + 'T00:00:00Z').getTime();
    const b = new Date(hasta + 'T00:00:00Z').getTime();
    const diff = Math.floor((b - a) / (1000 * 60 * 60 * 24));
    return diff + 1;
  }

  private addDays(dateISO: string, days: number): string {
    const d = new Date(dateISO + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
  }

  private async uuid(manager: any): Promise<string> {
    // postgres gen_random_uuid() – si estás usando pgcrypto
    const r = await manager.query(`SELECT gen_random_uuid() as id`);
    return r?.[0]?.id;
  }

  private async findTenantSafe(
    repo: Repository<any>,
    alias: string,
    id: string,
  ) {
    const qb = repo.createQueryBuilder(alias);
    applyTenantScope(qb, alias);
    qb.andWhere(`${alias}.id = :id`, { id });
    qb.andWhere(`${alias}.deleted_at IS NULL`);
    return qb.getOne();
  }

  async recalcularParaOcupacionTx(
    manager: EntityManager,
    ocupacionId: string,
    tipoCambio: number,
  ) {
    const tenantId = currentTenantId();
    if (!tenantId) {
      throw new AppError({
        code: ErrorCodes.TENANT_REQUIRED,
        message: 'Tenant requerido',
        status: 400,
      });
    }

    // 1) ocupación + validar cerrada y con fechas
    const ocup = await this.findTenantSafe(
      manager.getRepository(Ocupacion),
      'o',
      ocupacionId,
    );
    if (!ocup) {
      throw new AppError({
        code: ErrorCodes.OCUPACION_NOT_FOUND,
        message: 'Ocupación no encontrada',
        status: 404,
        details: { id: ocupacionId },
      });
    }
    if (!ocup.fechaHasta) {
      throw new AppError({
        code: ErrorCodes.OCUPACION_FECHA_HASTA_REQUIRED,
        message: 'La ocupación debe tener fecha_hasta para calcular consumo',
        status: 400,
        details: { id: ocupacionId },
      });
    }

    const desde = ocup.fechaDesde;
    const hasta = ocup.fechaHasta;

    // 2) tropas de ocupación
    const qbOt = manager.getRepository(OcupacionTropa).createQueryBuilder('ot');
    applyTenantScope(qbOt, 'ot');
    qbOt.andWhere('ot.ocupacion_id = :id', { id: ocupacionId });
    qbOt.andWhere('ot.deleted_at IS NULL');
    const ots = await qbOt.getMany();

    if (!ots.length) {
      throw new AppError({
        code: ErrorCodes.OCUPACION_TROPAS_REQUIRED,
        message: 'No hay tropas asociadas a la ocupación',
        status: 400,
        details: { ocupacionId },
      });
    }

    // 3) pastura snapshot (obligatoria para motor)
    const pasturaId = ocup.pasturaIdSnapshot;
    if (!pasturaId) {
      throw new AppError({
        code: ErrorCodes.OCUPACION_PASTURA_SNAPSHOT_REQUIRED,
        message: 'La ocupación no tiene pastura snapshot, no se puede calcular',
        status: 400,
        details: { ocupacionId },
      });
    }

    const pastura = await this.findTenantSafe(
      manager.getRepository(Pastura),
      'p',
      pasturaId,
    );
    if (!pastura) {
      throw new AppError({
        code: ErrorCodes.PASTURA_NOT_FOUND,
        message: 'Pastura no encontrada',
        status: 404,
        details: { pasturaId },
      });
    }

    const precioArs = Number(pastura.precio_kg_ars);
    const precioUsd = Number(pastura.precio_kg_usd);

    // 4) Idempotencia: borrar snapshots y movimientos previos
    // snapshots por ocupación
    await manager
      .getRepository(ConsumoCalculado)
      .createQueryBuilder()
      .softDelete()
      .where('tenant_id = :t', { t: tenantId })
      .andWhere('ocupacion_id = :id', { id: ocupacionId })
      .execute();

    // movimientos alimento interno por ocupación
    await manager
      .getRepository(Movimiento)
      .createQueryBuilder()
      .softDelete()
      .where('tenant_id = :t', { t: tenantId })
      .andWhere('tipo = :tipo', { tipo: TipoMovimiento.ALIMENTO_INTERNO })
      .andWhere('source_type = :st', { st: 'OCUPACION' })
      .andWhere('source_id = :sid', { sid: ocupacionId })
      .execute();

    // 5) Calcular por tropa
    let totalKg = 0;

    for (const ot of ots) {
      const dias = this.daysInclusive(desde, hasta);

      const Pi = Number(ot.pesoInicio);
      const aumento = Number(ot.aumentoDiario);
      const factor = Number(ot.factorEngorde);

      // Pf estimado
      const Pf = Pi + dias * aumento;

      // consumo por cabeza (regla congelada)
      const consumoPorCabeza = ((Pi + Pf) / 2) * factor;

      // cabezas efectivas promedio durante la estadía
      const headsSum = await this.cabezasSumEnRango(
        manager,
        ot.tropaId,
        desde,
        hasta,
        ot.cabezasInicio,
      );
      const headsProm = headsSum / dias;

      const kg = consumoPorCabeza * headsProm;
      totalKg += kg;

      // snapshot
      await manager.getRepository(ConsumoCalculado).save(
        manager.getRepository(ConsumoCalculado).create({
          tenant_id: tenantId,
          ocupacionId,
          tropaId: ot.tropaId,
          fechaDesde: desde,
          fechaHasta: hasta,
          kgConsumidos: String(kg.toFixed(4)),
          precioKgArsSnapshot: String(precioArs.toFixed(4)),
          precioKgUsdSnapshot: String(precioUsd.toFixed(4)),
          tipoCambioSnapshot: String(tipoCambio.toFixed(6)),
          reglaVersion: REGLA_VERSION,
          datosBase: {
            regla_version: REGLA_VERSION,
            Pi,
            Pf,
            dias,
            aumento_diario: aumento,
            factor_engorde: factor,
            consumo_por_cabeza: consumoPorCabeza,
            cabezas_inicio: ot.cabezasInicio,
            cabezas_sum: headsSum,
            cabezas_prom: headsProm,
            pastura_id: pasturaId,
            precios: { ars: precioArs, usd: precioUsd },
            tipo_cambio: tipoCambio,
          },
        } as any),
      );
    }

    // 6) Movimientos internos (agregado por ocupación)
    const groupId = await this.uuid(manager);

    const montoUsd = totalKg * precioUsd;
    const montoArs = totalKg * precioArs;

    const fechaMov = hasta; // usamos fecha_hasta como fecha contable del movimiento

    const desc = `Alimento interno por ocupación ${ocupacionId} (${desde} a ${hasta})`;

    // AGRI ingreso (+)
    await manager.getRepository(Movimiento).save(
      manager.getRepository(Movimiento).create({
        tenant_id: tenantId,
        area: AreaMovimiento.AGRI,
        tipo: TipoMovimiento.ALIMENTO_INTERNO,
        sourceType: 'OCUPACION',
        sourceId: ocupacionId,
        groupId,
        fecha: fechaMov,
        montoArs: String(montoArs.toFixed(2)),
        montoUsd: String(montoUsd.toFixed(2)),
        tipoCambio: String(tipoCambio.toFixed(6)),
        descripcion: desc,
      } as any),
    );

    // GANA egreso (-)
    await manager.getRepository(Movimiento).save(
      manager.getRepository(Movimiento).create({
        tenant_id: tenantId,
        area: AreaMovimiento.GANA,
        tipo: TipoMovimiento.ALIMENTO_INTERNO,
        sourceType: 'OCUPACION',
        sourceId: ocupacionId,
        groupId,
        fecha: fechaMov,
        montoArs: String((-montoArs).toFixed(2)),
        montoUsd: String((-montoUsd).toFixed(2)),
        tipoCambio: String(tipoCambio.toFixed(6)),
        descripcion: desc,
      } as any),
    );

    return { totalKg: Number(totalKg.toFixed(4)), groupId };
  }
}
