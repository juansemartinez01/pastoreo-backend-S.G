// src/modules/agricultura/gastos-lote/entities/gasto-lote.entity.ts
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../../common/database/base.entity';

import { Lote } from '../../../maestros/lotes/entities/lote.entity';
import { Proveedor } from '../../../maestros/proveedores/entities/proveedor.entity';
import { Categoria } from '../../../maestros/categorias/entities/categoria.entity';

@Entity('ag_gastos_lote')
@Index('ix_gasto_lote_fecha', ['fecha'])
@Index('ix_gasto_lote_lote', ['loteId'])
@Index('ix_gasto_lote_prov', ['proveedorId'])
@Index('ix_gasto_lote_cat', ['categoriaId'])
export class GastoLote extends BaseEntity {
  @Column({ type: 'uuid', name: 'lote_id' })
  loteId: string;

  @ManyToOne(() => Lote, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'lote_id' })
  lote: Lote;

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
  fecha: string; // yyyy-mm-dd

  // Guardamos ARS + USD + tipo_cambio (snapshot)
  @Column({ type: 'numeric', precision: 14, scale: 4, name: 'monto_ars' })
  montoArs: string;

  @Column({ type: 'numeric', precision: 14, scale: 4, name: 'monto_usd' })
  montoUsd: string;

  @Column({ type: 'numeric', precision: 14, scale: 6, name: 'tipo_cambio' })
  tipoCambio: string;

  @Column({ type: 'varchar', length: 300, nullable: true })
  notas?: string | null;
}
