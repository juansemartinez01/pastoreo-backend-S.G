import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryFailedError } from 'typeorm';

import { BaseCrudTenantService } from '../../../common/crud/base-crud.service';
import { Pastura } from './entities/pastura.entity';
import { PasturaPrecioAudit } from './entities/pastura-precio-audit.entity';

import { AppError } from '../../../common/errors/app-error';
import { ErrorCodes } from '../../../common/errors/error-codes';

import { AuditService } from '../../audit/audit.service';

import { CreatePasturaDto } from './dto/create-pastura.dto';
import { UpdatePasturaDto } from './dto/update-pastura.dto';
import { applyTenantScope } from 'src/common/tenancy/apply-tenant-scope';
import { tenantContext } from 'src/modules/tenancy/tenant-context';

type Actor = { userId?: string; email?: string; requestId?: string };

function currentTenantId(): string | null {
  const store = (tenantContext as any).getStore?.();
  const t = store?.tenantId ?? null;
  return t ? String(t) : null;
}

// 👇 Tip: tu BaseCrudTenantService ya aplica tenant scope desde tenantContext.
// Por eso no pasamos tenantId a nada.
@Injectable()
export class PasturasService extends BaseCrudTenantService<Pastura> {
  constructor(
    @InjectRepository(Pastura) repo: Repository<Pastura>,
    @InjectRepository(PasturaPrecioAudit)
    private readonly auditRepo: Repository<PasturaPrecioAudit>,
    private readonly auditService: AuditService,
  ) {
    super(repo);
  }

  // LIST paginado + search/sort con opts del base service
  async listPasturas(q: any) {
    // normalizamos "search" -> q.q si tu frontend manda "search"
    const normalized = {
      ...q,
      q: q.q ?? q.search ?? undefined,
      // opcional: mapear sort si tu front manda "sort=nombre:ASC"
      // si no, lo dejamos para etapa 2
    };

    return super.list(normalized, {
      alias: 'p',
      strictTenant: true,
      allowGlobal: false,
      searchColumns: ['nombre', 'descripcion'],
      sortAllowed: ['nombre', 'created_at', 'updated_at', 'activo'],
      sortFallback: { by: 'created_at', order: 'DESC' },
      filterAllowed: ['activo'],
    });
  }

  async getOneOrFail(id: string) {
    // si querés NOT_FOUND específico de pastura:
    const row = await super.findById(id, {
      strictTenant: true,
      allowGlobal: false,
    });
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

  async createOne(dto: CreatePasturaDto, actor: Actor) {
    this.ensureValidPrices(dto.precio_kg_ars, dto.precio_kg_usd);

    try {
      const created = await super.create(
        {
          ...dto,
          precio_kg_ars: String(dto.precio_kg_ars),
          precio_kg_usd: String(dto.precio_kg_usd),
          activo: dto.activo ?? true,
        } as any,
        { strictTenant: true, allowGlobal: false },
      );

      // Auditoría transversal: usar el formato que tu AuditService espere.
      // Como no me pegaste audit.service.ts, te dejo una versión minimalista
      // que casi seguro encaja: action + entity + data + actor + requestId.
      // antes de save:
      const tenantId = currentTenantId();

      await this.auditService.write('admin', {
        tenant_id: tenantId,
        request_id: actor.requestId ?? 'unknown',
        action: 'PASTURA_CREATE',
        entity: 'Pastura',
        actor_user_id: actor.userId ?? null,
        actor_email: actor.email ?? null,
        payload: {
          action: 'PASTURA_CREATE',
          entity: 'Pastura',
          message: 'Pastura creada',
          extra: {
            pastura_id: created.id,
            nombre: created.nombre,
          },
        },
      });

      return created;
    } catch (e) {
      this.handleDbErrors(e);
    }
  }

  async updateOne(id: string, dto: UpdatePasturaDto, actor: Actor) {
    const prev = await this.getOneOrFail(id);

    const newArs = dto.precio_kg_ars ?? Number(prev.precio_kg_ars);
    const newUsd = dto.precio_kg_usd ?? Number(prev.precio_kg_usd);
    this.ensureValidPrices(newArs, newUsd);

    const changedPrice =
      dto.precio_kg_ars !== undefined || dto.precio_kg_usd !== undefined;

    try {
      const updated = await super.update(
        id,
        {
          ...dto,
          ...(dto.precio_kg_ars !== undefined
            ? { precio_kg_ars: String(dto.precio_kg_ars) }
            : {}),
          ...(dto.precio_kg_usd !== undefined
            ? { precio_kg_usd: String(dto.precio_kg_usd) }
            : {}),
        } as any,
        { strictTenant: true, allowGlobal: false },
      );

      const tenantId = currentTenantId();

      if (changedPrice) {
        // 1) Auditoría visible (tabla propia)
        await this.auditRepo.save(
          this.auditRepo.create({
            tenant_id: tenantId,
            pasturaId: id,
            precioArsAnterior: String(prev.precio_kg_ars),
            precioArsNuevo: String(dto.precio_kg_ars ?? prev.precio_kg_ars),
            precioUsdAnterior: String(prev.precio_kg_usd),
            precioUsdNuevo: String(dto.precio_kg_usd ?? prev.precio_kg_usd),
            actorUserId: actor.userId ?? null,
            actorEmail: actor.email ?? null,
            requestId: actor.requestId ?? null,
          } as any),
        );

        // 2) Auditoría transversal
        await this.auditService.write('admin', {
          request_id: actor.requestId ?? 'unknown',
          action: 'PASTURA_PRECIO_UPDATE',
          entity: 'Pastura',
          actor_user_id: actor.userId ?? null,
          actor_email: actor.email ?? null,
          payload: {
            action: 'PASTURA_PRECIO_UPDATE',
            entity: 'Pastura',
            message: 'Actualización de precio de pastura',
            extra: {
              pastura_id: id,
              precio_kg_ars: {
                from: prev.precio_kg_ars,
                to: String(dto.precio_kg_ars ?? prev.precio_kg_ars),
              },
              precio_kg_usd: {
                from: prev.precio_kg_usd,
                to: String(dto.precio_kg_usd ?? prev.precio_kg_usd),
              },
            },
          },
        });
      }

      return updated;
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
        code: ErrorCodes.PASTURA_NOT_FOUND,
        message: 'Pastura no encontrada',
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
        code: ErrorCodes.PASTURA_NOT_FOUND,
        message: 'Pastura no encontrada',
        status: 404,
        details: { id },
      });
    }
    return true;
  }

  async getPrecioAudit(pasturaId: string, page = 1, limit = 50) {
    await this.getOneOrFail(pasturaId);

    const take = Math.min(limit, 200);
    const skip = (page - 1) * take;

    const qb = this.auditRepo.createQueryBuilder('a');

    applyTenantScope(qb, 'a');

    qb.andWhere('a.pastura_id = :id', { id: pasturaId });

    qb.orderBy('a.changed_at', 'DESC');
    qb.skip(skip).take(take);

    const [rows, total] = await qb.getManyAndCount();

    return { rows, total, page, limit: take };
  }

  private ensureValidPrices(ars: number, usd: number) {
    if (ars < 0 || usd < 0 || Number.isNaN(ars) || Number.isNaN(usd)) {
      throw new AppError({
        code: ErrorCodes.PASTURA_PRECIO_INVALID,
        message: 'Precio inválido (ARS/USD deben ser >= 0)',
        status: 400,
        details: { ars, usd },
      });
    }
  }

  private handleDbErrors(e: unknown): never {
    if (e instanceof QueryFailedError) {
      const msg = (e as any)?.message as string | undefined;
      const code = (e as any)?.code as string | undefined;

      if (code === '23505') {
        throw new AppError({
          code: ErrorCodes.PASTURA_DUPLICATE_NOMBRE,
          message: 'Ya existe una pastura con ese nombre',
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
