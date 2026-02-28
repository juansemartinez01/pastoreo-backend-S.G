// src/modules/maestros/centros-costo/entities/centro-costo.entity.ts
import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../../../common/database/base.entity';

export enum NombreCentroCosto {
  AGRICULTURA = 'AGRICULTURA',
  GANADERIA = 'GANADERIA',
}

@Entity('cat_centros_costo')
@Index('ix_centros_costo_nombre', ['nombre'])
@Index('ix_centros_costo_activo', ['activo'])
@Index('ix_centros_costo_tenant', ['tenant_id'])
export class CentroCosto extends BaseEntity {
  @Column({ type: 'enum', enum: NombreCentroCosto })
  nombre: NombreCentroCosto;

  @Column({ type: 'varchar', length: 200, nullable: true })
  descripcion?: string | null;

  @Column({ type: 'boolean', default: true })
  activo: boolean;
}
