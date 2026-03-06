// src/modules/agricultura/ingresos-campania/ingresos-campania.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';

import { BaseCrudTenantService } from '../../../common/crud/base-crud.service';
import { AppError } from '../../../common/errors/app-error';
import { ErrorCode, ErrorCodes } from '../../../common/errors/error-codes';
import { applyTenantScope } from '../../../common/tenancy/apply-tenant-scope';

import { IngresoCampania } from './entities/ingreso-campania.entity';
import {
  Campania,
  EstadoCampania,
} from '../campanias/entities/campania.entity';
import { Categoria } from '../../maestros/categorias/entities/categoria.entity';

import { AdjuntosService } from '../../docs/adjuntos/adjuntos.service';

@Injectable()
export class IngresosCampaniaService extends BaseCrudTenantService<IngresoCampania> {
  private readonly OWNER_TYPE = 'AG_INGRESO_CAMPANIA';

  constructor(
    @InjectRepository(IngresoCampania)
    repo: Repository<IngresoCampania>,
    @InjectRepository(Campania)
    private readonly campaniasRepo: Repository<Campania>,
    @InjectRepository(Categoria)
    private readonly catRepo: Repository<Categoria>,
    private readonly adjuntos: AdjuntosService,
  ) {
    super(repo);
  }

  async listIngresos(q: any) {
    const page = Number(q.page ?? 1);
    const limit = Math.min(Number(q.limit ?? 20), 200);
    const skip = (page - 1) * limit;

    const qb = this.repo.createQueryBuilder('i');
    applyTenantScope(qb, 'i');

    qb.leftJoinAndSelect('i.campania', 'c');
    qb.leftJoinAndSelect('c.lote', 'l');
    qb.leftJoinAndSelect('c.pastura', 'pa');
    qb.leftJoinAndSelect('i.categoria', 'cat');

    if (q.campaniaId) {
      qb.andWhere('i.campania_id = :campaniaId', { campaniaId: q.campaniaId });
    }

    if (q.loteId) {
      qb.andWhere('c.lote_id = :loteId', { loteId: q.loteId });
    }

    if (q.categoriaId) {
      qb.andWhere('i.categoria_id = :categoriaId', {
        categoriaId: q.categoriaId,
      });
    }

    if (q.fechaDesde) {
      qb.andWhere('i.fecha >= :fd', { fd: q.fechaDesde });
    }

    if (q.fechaHasta) {
      qb.andWhere('i.fecha <= :fh', { fh: q.fechaHasta });
    }

    const search = q.q ?? q.search;
    if (search) {
      qb.andWhere(
        `(i.notas ILIKE :s
          OR c.nombre ILIKE :s
          OR l.nombre ILIKE :s
          OR pa.nombre ILIKE :s
          OR cat.nombre ILIKE :s)`,
        { s: `%${search}%` },
      );
    }

    const sortBy = q.sortBy ?? 'fecha';
    const sortOrder =
      String(q.sortOrder ?? 'DESC').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const sortMap: Record<string, string> = {
      fecha: 'i.fecha',
      created_at: 'i.created_at',
      updated_at: 'i.updated_at',
      monto_ars: 'i.monto_ars',
      monto_usd: 'i.monto_usd',
      campania: 'c.nombre',
      lote: 'l.nombre',
    };

    qb.orderBy(sortMap[sortBy] ?? 'i.fecha', sortOrder as any);
    qb.skip(skip).take(limit);

    const [items, total] = await qb.getManyAndCount();
    return { items, total, page, limit };
  }

  async getOneOrFail(id: string) {
    const qb = this.repo.createQueryBuilder('i');
    applyTenantScope(qb, 'i');

    qb.leftJoinAndSelect('i.campania', 'c');
    qb.leftJoinAndSelect('c.lote', 'l');
    qb.leftJoinAndSelect('c.pastura', 'pa');
    qb.leftJoinAndSelect('i.categoria', 'cat');
    qb.andWhere('i.id = :id', { id });

    const row = await qb.getOne();
    if (!row) {
      throw new AppError({
        code: ErrorCodes.INGRESO_CAMPANIA_NOT_FOUND,
        message: 'Ingreso de campaña no encontrado',
        status: 404,
        details: { id },
      });
    }

    const adj = await this.adjuntos.listByOwner(this.OWNER_TYPE, id);

    return {
      ...row,
      adjuntos: adj,
    };
  }

  async createOne(dto: any) {
    await this.ensureRefs(dto.campaniaId, dto.categoriaId, dto.fecha);
    this.ensureMoney(dto.monto_ars, dto.monto_usd, dto.tipo_cambio);

    try {
      const created = await super.create(
        {
          campaniaId: dto.campaniaId,
          categoriaId: dto.categoriaId,
          fecha: dto.fecha,
          montoArs: String(dto.monto_ars),
          montoUsd: String(dto.monto_usd),
          tipoCambio: String(dto.tipo_cambio),
          notas: dto.notas ?? null,
        } as any,
        { strictTenant: true, allowGlobal: false },
      );

      if (dto.adjuntos?.length) {
        await this.adjuntos.addMany(this.OWNER_TYPE, created.id, dto.adjuntos);
      }

      return this.getOneOrFail(created.id);
    } catch (e) {
      this.handleDbErrors(e);
    }
  }

  async updateOne(id: string, dto: any) {
    const prev = await this.getOneOrFail(id);

    const campaniaId = dto.campaniaId ?? prev.campaniaId;
    const categoriaId = dto.categoriaId ?? prev.categoriaId;
    const fecha = dto.fecha ?? prev.fecha;

    await this.ensureRefs(campaniaId, categoriaId, fecha);

    if (
      dto.monto_ars !== undefined ||
      dto.monto_usd !== undefined ||
      dto.tipo_cambio !== undefined
    ) {
      this.ensureMoney(
        dto.monto_ars ?? Number(prev.montoArs),
        dto.monto_usd ?? Number(prev.montoUsd),
        dto.tipo_cambio ?? Number(prev.tipoCambio),
      );
    }

    try {
      await super.update(
        id,
        {
          ...(dto.campaniaId ? { campaniaId: dto.campaniaId } : {}),
          ...(dto.categoriaId ? { categoriaId: dto.categoriaId } : {}),
          ...(dto.fecha ? { fecha: dto.fecha } : {}),
          ...(dto.monto_ars !== undefined
            ? { montoArs: String(dto.monto_ars) }
            : {}),
          ...(dto.monto_usd !== undefined
            ? { montoUsd: String(dto.monto_usd) }
            : {}),
          ...(dto.tipo_cambio !== undefined
            ? { tipoCambio: String(dto.tipo_cambio) }
            : {}),
          ...(dto.notas !== undefined ? { notas: dto.notas } : {}),
        } as any,
        { strictTenant: true, allowGlobal: false },
      );

      if (dto.adjuntos?.length) {
        await this.adjuntos.addMany(this.OWNER_TYPE, id, dto.adjuntos);
      }

      return this.getOneOrFail(id);
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
        code: ErrorCodes.INGRESO_CAMPANIA_NOT_FOUND,
        message: 'Ingreso de campaña no encontrado',
        status: 404,
        details: { id },
      });
    }

    return true;
  }

  async restoreOne(id: string) {
    const qb = this.repo.createQueryBuilder('i').withDeleted();
    applyTenantScope(qb, 'i');
    qb.andWhere('i.id = :id', { id });

    const row = await qb.getOne();

    if (!row) {
      throw new AppError({
        code: ErrorCodes.INGRESO_CAMPANIA_NOT_FOUND,
        message: 'Ingreso de campaña no encontrado',
        status: 404,
        details: { id },
      });
    }

    await this.ensureRefs(row.campaniaId, row.categoriaId, row.fecha);

    const ok = await super.restore(id, {
      strictTenant: true,
      allowGlobal: false,
    });

    if (!ok) {
      throw new AppError({
        code: ErrorCodes.INGRESO_CAMPANIA_NOT_FOUND,
        message: 'Ingreso de campaña no encontrado',
        status: 404,
        details: { id },
      });
    }

    return true;
  }

  private ensureMoney(ars: number, usd: number, tc: number) {
    if (
      [ars, usd, tc].some(
        (x) => x === null || x === undefined || Number.isNaN(Number(x)),
      )
    ) {
      throw new AppError({
        code: ErrorCodes.MONEY_INVALID,
        message: 'Montos inválidos',
        status: 400,
      });
    }

    if (ars < 0 || usd < 0 || tc < 0) {
      throw new AppError({
        code: ErrorCodes.MONEY_INVALID,
        message: 'Montos inválidos (ARS/USD/TC deben ser >= 0)',
        status: 400,
        details: { ars, usd, tc },
      });
    }
  }

  private async ensureRefs(
    campaniaId?: string,
    categoriaId?: string,
    fecha?: string,
  ) {
    if (campaniaId) {
      const campania = await this.ensureCampaniaEditable(campaniaId);

      if (fecha) {
        this.ensureFechaDentroDeCampania(campania, fecha);
      }
    }

    if (categoriaId) {
      await this.ensureExistsTenantSafe(
        this.catRepo,
        'c',
        categoriaId,
        ErrorCodes.CATEGORIA_NOT_FOUND,
        'Categoría no encontrada',
      );
    }
  }

  private async ensureCampaniaEditable(id: string): Promise<Campania> {
    const qb = this.campaniasRepo.createQueryBuilder('c');
    applyTenantScope(qb, 'c');
    qb.andWhere('c.id = :id', { id });
    qb.andWhere('c.deleted_at IS NULL');

    const row = await qb.getOne();

    if (!row) {
      throw new AppError({
        code: ErrorCodes.CAMPANIA_NOT_FOUND,
        message: 'Campaña no encontrada',
        status: 404,
        details: { id },
      });
    }

    if (row.estadoActual === EstadoCampania.CERRADA) {
      throw new AppError({
        code: ErrorCodes.CAMPANIA_CERRADA,
        message: 'No se pueden imputar ingresos a una campaña cerrada',
        status: 409,
        details: { id },
      });
    }

    return row;
  }

  private ensureFechaDentroDeCampania(campania: Campania, fecha: string) {
    if (fecha < campania.fechaInicio) {
      throw new AppError({
        code: ErrorCodes.INGRESO_CAMPANIA_FECHA_INVALID,
        message:
          'La fecha del ingreso no puede ser menor a la fecha de inicio de la campaña',
        status: 400,
        details: {
          fechaIngreso: fecha,
          fechaInicioCampania: campania.fechaInicio,
          campaniaId: campania.id,
        },
      });
    }

    if (campania.fechaCierre && fecha > campania.fechaCierre) {
      throw new AppError({
        code: ErrorCodes.INGRESO_CAMPANIA_FECHA_INVALID,
        message:
          'La fecha del ingreso no puede ser mayor a la fecha de cierre de la campaña',
        status: 400,
        details: {
          fechaIngreso: fecha,
          fechaCierreCampania: campania.fechaCierre,
          campaniaId: campania.id,
        },
      });
    }
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
