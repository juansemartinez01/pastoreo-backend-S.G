// src/modules/agricultura/gastos-campania/gastos-campania.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';

import { BaseCrudTenantService } from '../../../common/crud/base-crud.service';
import { AppError } from '../../../common/errors/app-error';
import { ErrorCode, ErrorCodes } from '../../../common/errors/error-codes';
import { applyTenantScope } from '../../../common/tenancy/apply-tenant-scope';

import { GastoCampania } from './entities/gasto-campania.entity';
import {
  Campania,
  EstadoCampania,
} from '../campanias/entities/campania.entity';
import { Proveedor } from '../../maestros/proveedores/entities/proveedor.entity';
import { Categoria } from '../../maestros/categorias/entities/categoria.entity';

import { AdjuntosService } from '../../docs/adjuntos/adjuntos.service';

@Injectable()
export class GastosCampaniaService extends BaseCrudTenantService<GastoCampania> {
  private readonly OWNER_TYPE = 'AG_GASTO_CAMPANIA';

  constructor(
    @InjectRepository(GastoCampania)
    repo: Repository<GastoCampania>,
    @InjectRepository(Campania)
    private readonly campaniasRepo: Repository<Campania>,
    @InjectRepository(Proveedor)
    private readonly provRepo: Repository<Proveedor>,
    @InjectRepository(Categoria)
    private readonly catRepo: Repository<Categoria>,
    private readonly adjuntos: AdjuntosService,
  ) {
    super(repo);
  }

  async listGastos(q: any) {
    const page = Number(q.page ?? 1);
    const limit = Math.min(Number(q.limit ?? 20), 200);
    const skip = (page - 1) * limit;

    const qb = this.repo.createQueryBuilder('g');
    applyTenantScope(qb, 'g');

    qb.leftJoinAndSelect('g.campania', 'c');
    qb.leftJoinAndSelect('c.lote', 'l');
    qb.leftJoinAndSelect('c.pastura', 'pa');
    qb.leftJoinAndSelect('g.proveedor', 'p');
    qb.leftJoinAndSelect('g.categoria', 'cat');

    if (q.campaniaId) {
      qb.andWhere('g.campania_id = :campaniaId', { campaniaId: q.campaniaId });
    }

    if (q.loteId) {
      qb.andWhere('c.lote_id = :loteId', { loteId: q.loteId });
    }

    if (q.proveedorId) {
      qb.andWhere('g.proveedor_id = :proveedorId', {
        proveedorId: q.proveedorId,
      });
    }

    if (q.categoriaId) {
      qb.andWhere('g.categoria_id = :categoriaId', {
        categoriaId: q.categoriaId,
      });
    }

    if (q.fechaDesde) {
      qb.andWhere('g.fecha >= :fd', { fd: q.fechaDesde });
    }

    if (q.fechaHasta) {
      qb.andWhere('g.fecha <= :fh', { fh: q.fechaHasta });
    }

    const search = q.q ?? q.search;
    if (search) {
      qb.andWhere(
        `(g.notas ILIKE :s
          OR c.nombre ILIKE :s
          OR l.nombre ILIKE :s
          OR pa.nombre ILIKE :s
          OR p.nombre ILIKE :s
          OR cat.nombre ILIKE :s)`,
        { s: `%${search}%` },
      );
    }

    const sortBy = q.sortBy ?? 'fecha';
    const sortOrder =
      String(q.sortOrder ?? 'DESC').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const sortMap: Record<string, string> = {
      fecha: 'g.fecha',
      created_at: 'g.created_at',
      updated_at: 'g.updated_at',
      monto_ars: 'g.monto_ars',
      monto_usd: 'g.monto_usd',
      campania: 'c.nombre',
      lote: 'l.nombre',
    };

    qb.orderBy(sortMap[sortBy] ?? 'g.fecha', sortOrder as any);
    qb.skip(skip).take(limit);

    const [items, total] = await qb.getManyAndCount();
    return { items, total, page, limit };
  }

  async getOneOrFail(id: string) {
    const qb = this.repo.createQueryBuilder('g');
    applyTenantScope(qb, 'g');

    qb.leftJoinAndSelect('g.campania', 'c');
    qb.leftJoinAndSelect('c.lote', 'l');
    qb.leftJoinAndSelect('c.pastura', 'pa');
    qb.leftJoinAndSelect('g.proveedor', 'p');
    qb.leftJoinAndSelect('g.categoria', 'cat');

    qb.andWhere('g.id = :id', { id });

    const row = await qb.getOne();
    if (!row) {
      throw new AppError({
        code: ErrorCodes.GASTO_CAMPANIA_NOT_FOUND,
        message: 'Gasto de campaña no encontrado',
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
    await this.ensureRefs(
      dto.campaniaId,
      dto.proveedorId,
      dto.categoriaId,
      dto.fecha,
    );
    this.ensureMoney(dto.monto_ars, dto.monto_usd, dto.tipo_cambio);

    try {
      const created = await super.create(
        {
          campaniaId: dto.campaniaId,
          proveedorId: dto.proveedorId ?? null,
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
    const proveedorId =
      dto.proveedorId !== undefined ? dto.proveedorId : prev.proveedorId;
    const categoriaId = dto.categoriaId ?? prev.categoriaId;
    const fecha = dto.fecha ?? prev.fecha;

    await this.ensureRefs(campaniaId, proveedorId, categoriaId, fecha);

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
          ...(dto.proveedorId !== undefined
            ? { proveedorId: dto.proveedorId }
            : {}),
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
        code: ErrorCodes.GASTO_CAMPANIA_NOT_FOUND,
        message: 'Gasto de campaña no encontrado',
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
        code: ErrorCodes.GASTO_CAMPANIA_NOT_FOUND,
        message: 'Gasto de campaña no encontrado',
        status: 404,
        details: { id },
      });
    }

    await this.ensureRefs(row.campaniaId, row.proveedorId, row.categoriaId);

    const ok = await super.restore(id, {
      strictTenant: true,
      allowGlobal: false,
    });

    if (!ok) {
      throw new AppError({
        code: ErrorCodes.GASTO_CAMPANIA_NOT_FOUND,
        message: 'Gasto de campaña no encontrado',
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
    proveedorId?: string | null,
    categoriaId?: string,
    fecha?: string,
  ) {
    if (campaniaId) {
      const campania = await this.ensureCampaniaEditable(campaniaId);

      if (fecha) {
        this.ensureFechaDentroDeCampania(campania, fecha);
      }
    }

    if (proveedorId) {
      await this.ensureExistsTenantSafe(
        this.provRepo,
        'p',
        proveedorId,
        ErrorCodes.PROVEEDOR_NOT_FOUND,
        'Proveedor no encontrado',
      );
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

  private ensureFechaDentroDeCampania(campania: Campania, fecha: string) {
    if (fecha < campania.fechaInicio) {
      throw new AppError({
        code: ErrorCodes.GASTO_CAMPANIA_FECHA_INVALID,
        message:
          'La fecha del gasto no puede ser menor a la fecha de inicio de la campaña',
        status: 400,
        details: {
          fechaGasto: fecha,
          fechaInicioCampania: campania.fechaInicio,
          campaniaId: campania.id,
        },
      });
    }

    if (campania.fechaCierre && fecha > campania.fechaCierre) {
      throw new AppError({
        code: ErrorCodes.GASTO_CAMPANIA_FECHA_INVALID,
        message:
          'La fecha del gasto no puede ser mayor a la fecha de cierre de la campaña',
        status: 400,
        details: {
          fechaGasto: fecha,
          fechaCierreCampania: campania.fechaCierre,
          campaniaId: campania.id,
        },
      });
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
        message: 'No se pueden imputar gastos a una campaña cerrada',
        status: 409,
        details: { id },
      });
    }

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
