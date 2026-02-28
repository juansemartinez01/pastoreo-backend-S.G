// src/modules/maestros/proveedores/entities/proveedor.entity.ts
import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../../../common/database/base.entity';

export enum TipoProveedor {
  INSUMO = 'INSUMO',
  SERVICIO = 'SERVICIO',
  TRANSPORTE = 'TRANSPORTE',
  OTRO = 'OTRO',
}

@Entity('prov_proveedores')
@Index('ix_proveedores_nombre', ['nombre'])
@Index('ix_proveedores_activo', ['activo'])
@Index('ix_proveedores_tenant', ['tenant_id'])
@Index('ix_proveedores_cuit', ['cuit'])
export class Proveedor extends BaseEntity {
  @Column({ type: 'varchar', length: 160 })
  nombre: string;

  // ✅ Guardado normalizado (solo dígitos) o null
  @Column({ type: 'varchar', length: 20, nullable: true })
  cuit?: string | null;

  @Column({ type: 'enum', enum: TipoProveedor, default: TipoProveedor.OTRO })
  tipo: TipoProveedor;

  @Column({ type: 'varchar', length: 40, nullable: true })
  telefono?: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  email?: string | null;

  @Column({ type: 'varchar', length: 300, nullable: true })
  notas?: string | null;

  @Column({ type: 'boolean', default: true })
  activo: boolean;
}
