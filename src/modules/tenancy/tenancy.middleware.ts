import { Injectable, NestMiddleware, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response, NextFunction } from 'express';
import { tenantContext } from './tenant-context';
import { UUID } from 'typeorm/driver/mongodb/bson.typings.js';

function headerValue(req: Request, name: string): string | null {
  const v = req.headers[name.toLowerCase()];
  if (!v) return null;
  if (Array.isArray(v)) return v[0] ? String(v[0]) : null;
  return String(v);
}

// UUID genérico (v1-v5). Si querés solo v4, lo ajustamos.
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function normalizeHeaderName(v: string) {
  // por si viene con comentarios inline o espacios raros:
  // "x-tenant-id   # comentario" -> "x-tenant-id"
  return String(v ?? '')
    .trim()
    .split('#')[0]
    .trim()
    .split(/\s+/)[0]
    .trim()
    .toLowerCase();
}

function normalizeValue(v: any): string | null {
  if (v === undefined || v === null) return null;

  let s = String(v).trim();

  // sacar invisibles comunes (copypaste)
  s = s.replace(/[\u200B-\u200D\uFEFF]/g, '');

  // si viene "uuid,algo" o "uuid;algo" nos quedamos con el primero
  s = s.split(',')[0].split(';')[0].trim();

  // 🔥 CLAVE: nos quedamos SOLO con caracteres válidos de UUID (hex + '-')
  // esto hace inmune a comillas, \"...\",
  // y a cualquier basura alrededor
  s = s.replace(/[^0-9a-fA-F-]/g, '');

  return s.length ? s : null;
}

function ensureUuidOrNull(value: any, label: string): string | null {
  const v = normalizeValue(value);
  if (!v) return null;

  if (!UUID_RE.test(v)) {
    throw new BadRequestException(`Invalid ${label}: "${value}"`);
  }

  return v;
}

@Injectable()
export class TenancyMiddleware implements NestMiddleware {
  constructor(private readonly cfg: ConfigService) {}

  use(
    req: Request & { user?: any; tenantId?: any; tenantKey?: any },
    _res: Response,
    next: NextFunction,
  ) {
    const enabled = Boolean(this.cfg.get<boolean>('tenancy.enabled'));
    const required = Boolean(this.cfg.get<boolean>('tenancy.required'));

    // Si algún día lo deshabilitás, no ensuciamos el contexto
    if (!enabled) {
      tenantContext.run({ tenantId: null, tenantKey: null, requestId: (req as any).id ?? null }, () => next());
      return;
    }

    const headerName = normalizeHeaderName(
      this.cfg.get<string>('tenancy.header') ?? 'x-tenant-id',
    );

    // 1) Preferir JWT si existe
    const jwtTenantId = normalizeValue(req.user?.tenant_id);
    const jwtTenantKey = normalizeValue(req.user?.tenant_key);

    // 2) Fallback a headers (login/register)
    const hTenantId = normalizeValue(headerValue(req, 'x-tenant-id'));
    const hTenantKey = normalizeValue(headerValue(req, 'x-tenant-key'));

    // Elegimos el “primary” según config
    const primaryFromJwt =
      headerName === 'x-tenant-id'
        ? jwtTenantId
        : headerName === 'x-tenant-key'
          ? jwtTenantKey
          : null;

    const primaryFromHeader = normalizeValue(headerValue(req, headerName));
    const primary = primaryFromJwt ?? primaryFromHeader;

    if (required && !primary) {
      throw new BadRequestException(`Missing tenant (jwt or header): ${headerName}`);
    }

    // tenantId/tenantKey definitivos
    
    const tenantId = ensureUuidOrNull(jwtTenantId ?? hTenantId, 'tenant_id');
    const tenantKey = normalizeValue(jwtTenantKey ?? hTenantKey);

    req.tenantId = tenantId;
    req.tenantKey = tenantKey;

    const requestId = (req as any).id ?? null;

    // DEBUG opcional (descomentá si querés ver qué llega)
    // console.log('[TENANCY]', {
    //   headerName,
    //   rawHeaderTenantId: headerValue(req, 'x-tenant-id'),
    //   rawPrimary: headerValue(req, headerName),
    //   jwtTenantId: req.user?.tenant_id,
    //   resolvedTenantId: tenantId,
    //   requestId,
    // });

    tenantContext.run({ tenantId, tenantKey, requestId }, () => next());
  }
}