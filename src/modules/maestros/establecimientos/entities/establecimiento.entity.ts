// src/modules/maestros/establecimientos/entities/establecimiento.entity.ts
import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../../../common/database/base.entity';

@Entity('est_establecimientos')
@Index('ix_establecimientos_nombre', ['nombre'])
@Index('ix_establecimientos_tenant', ['tenant_id'])
export class Establecimiento extends BaseEntity {
  @Column({ type: 'varchar', length: 120 })
  nombre: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  ubicacion_texto?: string | null;
}
