// src/modules/ganaderia/gastos-tropa/entities/gasto-tropa.entity.ts
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../../common/database/base.entity';

import { Tropa } from '../../tropas/entities/tropa.entity';
import { Proveedor } from '../../../maestros/proveedores/entities/proveedor.entity';
import { Categoria } from '../../../maestros/categorias/entities/categoria.entity';

@Entity('ga_gastos_tropa')
@Index('ix_gasto_tropa_fecha', ['fecha'])
@Index('ix_gasto_tropa_tropa', ['tropaId'])
@Index('ix_gasto_tropa_prov', ['proveedorId'])
@Index('ix_gasto_tropa_cat', ['categoriaId'])
export class GastoTropa extends BaseEntity {
  @Column({ type: 'uuid', name: 'tropa_id' })
  tropaId: string;

  @ManyToOne(() => Tropa, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'tropa_id' })
  tropa: Tropa;

  @Column({ type: 'uuid', name: 'proveedor_id', nullable: true })
  proveedorId?: string | null;

  @ManyToOne(() => Proveedor, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'proveedor_id' })
  proveedor?: Proveedor | null;

  @Column({ type: 'uuid', name: 'categoria_id' })
  categoriaId: string;

  @ManyToOne(() => Categoria, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'categoria_id' })
  categoria: Categoria;

  @Column({ type: 'date' })
  fecha: string;

  @Column({ type: 'numeric', precision: 14, scale: 4, name: 'monto_ars' })
  montoArs: string;

  @Column({ type: 'numeric', precision: 14, scale: 4, name: 'monto_usd' })
  montoUsd: string;

  @Column({ type: 'numeric', precision: 14, scale: 6, name: 'tipo_cambio' })
  tipoCambio: string;

  @Column({ type: 'varchar', length: 300, nullable: true })
  notas?: string | null;
}
