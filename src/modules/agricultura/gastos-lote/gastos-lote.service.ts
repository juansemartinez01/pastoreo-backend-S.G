// src/modules/agricultura/gastos-lote/gastos-lote.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';

import { BaseCrudTenantService } from '../../../common/crud/base-crud.service';
import { AppError } from '../../../common/errors/app-error';
import { ErrorCodes } from '../../../common/errors/error-codes';
import { applyTenantScope } from 'src/common/tenancy/apply-tenant-scope';

import { GastoLote } from './entities/gasto-lote.entity';
import { Lote } from '../../maestros/lotes/entities/lote.entity';
import { Proveedor } from '../../maestros/proveedores/entities/proveedor.entity';
import { Categoria } from '../../maestros/categorias/entities/categoria.entity';

import { AdjuntosService } from '../../docs/adjuntos/adjuntos.service';


type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

@Injectable()
export class GastosLoteService extends BaseCrudTenantService<GastoLote> {
  private readonly OWNER_TYPE = 'AG_GASTO_LOTE';

  constructor(
    @InjectRepository(GastoLote) repo: Repository<GastoLote>,
    @InjectRepository(Lote) private readonly lotesRepo: Repository<Lote>,
    @InjectRepository(Proveedor)
    private readonly provRepo: Repository<Proveedor>,
    @InjectRepository(Categoria)
    private readonly catRepo: Repository<Categoria>,
    private readonly adjuntos: AdjuntosService,
  ) {
    super(repo);
  }

  async listGastos(q: any) {
    const normalized = { ...q };

    // soportamos filtros por query string típicos
    // fechaDesde / fechaHasta se manejan fuera de BaseCrudTenantService (custom QB)
    const page = Number(q.page ?? 1);
    const limit = Math.min(Number(q.limit ?? 20), 200);
    const skip = (page - 1) * limit;

    const qb = this.repo.createQueryBuilder('g');
    applyTenantScope(qb, 'g');

    qb.leftJoin('g.lote', 'l');
    qb.leftJoin('g.proveedor', 'p');
    qb.leftJoin('g.categoria', 'c');

    // filtros
    if (q.loteId) qb.andWhere('g.lote_id = :loteId', { loteId: q.loteId });
    if (q.proveedorId)
      qb.andWhere('g.proveedor_id = :proveedorId', {
        proveedorId: q.proveedorId,
      });
    if (q.categoriaId)
      qb.andWhere('g.categoria_id = :categoriaId', {
        categoriaId: q.categoriaId,
      });

    if (q.fechaDesde) qb.andWhere('g.fecha >= :fd', { fd: q.fechaDesde });
    if (q.fechaHasta) qb.andWhere('g.fecha <= :fh', { fh: q.fechaHasta });

    // search simple (notas + nombres joined)
    const search = q.q ?? q.search;
    if (search) {
      qb.andWhere(
        `(g.notas ILIKE :s OR l.nombre ILIKE :s OR p.nombre ILIKE :s OR c.nombre ILIKE :s)`,
        { s: `%${search}%` },
      );
    }

    // sorting
    const sortBy = q.sortBy ?? 'fecha';
    const sortOrder =
      (q.sortOrder ?? 'DESC').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const sortMap: Record<string, string> = {
      fecha: 'g.fecha',
      created_at: 'g.created_at',
      updated_at: 'g.updated_at',
      monto_ars: 'g.monto_ars',
      monto_usd: 'g.monto_usd',
    };

    qb.orderBy(sortMap[sortBy] ?? 'g.fecha', sortOrder as any);

    qb.skip(skip).take(limit);

    const [items, total] = await qb.getManyAndCount();
    return { items, total, page, limit };
  }

  async getOneOrFail(id: string) {
    const qb = this.repo.createQueryBuilder('g');
    applyTenantScope(qb, 'g');

    qb.leftJoinAndSelect('g.lote', 'l');
    qb.leftJoinAndSelect('g.proveedor', 'p');
    qb.leftJoinAndSelect('g.categoria', 'c');

    qb.andWhere('g.id = :id', { id });

    const row = await qb.getOne();
    if (!row) {
      throw new AppError({
        code: ErrorCodes.GASTO_LOTE_NOT_FOUND,
        message: 'Gasto por lote no encontrado',
        status: 404,
        details: { id },
      });
    }

    const adj = await this.adjuntos.listByOwner(this.OWNER_TYPE, id);
    return { ...row, adjuntos: adj };
  }

  async createOne(dto: any) {
    await this.ensureRefs(dto.loteId, dto.proveedorId, dto.categoriaId);
    this.ensureMoney(dto.monto_ars, dto.monto_usd, dto.tipo_cambio);

    try {
      const created = await super.create(
        {
          loteId: dto.loteId,
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
    await this.getOneOrFail(id);

    const loteId = dto.loteId;
    const proveedorId = dto.proveedorId;
    const categoriaId = dto.categoriaId;

    if (loteId || proveedorId !== undefined || categoriaId) {
      await this.ensureRefs(loteId, proveedorId, categoriaId);
    }

    if (
      dto.monto_ars !== undefined ||
      dto.monto_usd !== undefined ||
      dto.tipo_cambio !== undefined
    ) {
      // si tocan money, deben respetar >=0
      this.ensureMoney(
        dto.monto_ars ?? 0,
        dto.monto_usd ?? 0,
        dto.tipo_cambio ?? 0,
      );
    }

    try {
      await super.update(
        id,
        {
          ...(dto.loteId ? { loteId: dto.loteId } : {}),
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
        code: ErrorCodes.GASTO_LOTE_NOT_FOUND,
        message: 'Gasto por lote no encontrado',
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
        code: ErrorCodes.GASTO_LOTE_NOT_FOUND,
        message: 'Gasto por lote no encontrado',
        status: 404,
        details: { id },
      });
    }
    return true;
  }

  // ---------------- Helpers ----------------

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
    loteId?: string,
    proveedorId?: string | null,
    categoriaId?: string,
  ) {
    if (loteId)
      await this.ensureExistsTenantSafe(
        this.lotesRepo,
        'l',
        loteId,
        ErrorCodes.LOTE_NOT_FOUND,
        'Lote no encontrado',
      );
    if (proveedorId)
      await this.ensureExistsTenantSafe(
        this.provRepo,
        'p',
        proveedorId,
        ErrorCodes.PROVEEDOR_NOT_FOUND,
        'Proveedor no encontrado',
      );
    if (categoriaId)
      await this.ensureExistsTenantSafe(
        this.catRepo,
        'c',
        categoriaId,
        ErrorCodes.CATEGORIA_NOT_FOUND,
        'Categoría no encontrada',
      );
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
