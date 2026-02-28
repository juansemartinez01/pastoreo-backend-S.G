// src/modules/maestros/categorias/entities/categoria.entity.ts
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../../common/database/base.entity';
import { CentroCosto } from '../../centros-costo/entities/centro-costo.entity';

@Entity('cat_categorias')
@Index('ix_categorias_nombre', ['nombre'])
@Index('ix_categorias_activo', ['activo'])
@Index('ix_categorias_tenant', ['tenant_id'])
@Index('ix_categorias_centro', ['centroCostoId'])
export class Categoria extends BaseEntity {
  @Column({ type: 'uuid', name: 'centro_costo_id' })
  centroCostoId: string;

  @ManyToOne(() => CentroCosto, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'centro_costo_id' })
  centroCosto: CentroCosto;

  @Column({ type: 'varchar', length: 120 })
  nombre: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  descripcion?: string | null;

  @Column({ type: 'boolean', default: true })
  activo: boolean;
}
