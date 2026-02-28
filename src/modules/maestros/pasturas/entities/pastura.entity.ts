import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../../../common/database/base.entity';

@Entity('cat_pasturas')
@Index('ix_pasturas_nombre', ['nombre'])
@Index('ix_pasturas_activo', ['activo'])
export class Pastura extends BaseEntity {
  @Column({ type: 'varchar', length: 120 })
  nombre: string;

  @Column({ type: 'varchar', length: 300, nullable: true })
  descripcion?: string | null;

  @Column({ type: 'numeric', precision: 14, scale: 4, default: 0 })
  precio_kg_ars: string; // numeric -> string en TS para precisión

  @Column({ type: 'numeric', precision: 14, scale: 4, default: 0 })
  precio_kg_usd: string;

  @Column({ type: 'boolean', default: true })
  activo: boolean;
}
