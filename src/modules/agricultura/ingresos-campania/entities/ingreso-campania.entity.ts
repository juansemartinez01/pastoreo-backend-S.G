// src/modules/agricultura/ingresos-campania/entities/ingreso-campania.entity.ts
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../../common/database/base.entity';

import { Campania } from '../../campanias/entities/campania.entity';
import { Categoria } from '../../../maestros/categorias/entities/categoria.entity';

@Entity('ag_ingresos_campania')
@Index('ix_ingreso_campania_fecha', ['fecha'])
@Index('ix_ingreso_campania_campania', ['campaniaId'])
@Index('ix_ingreso_campania_cat', ['categoriaId'])
export class IngresoCampania extends BaseEntity {
  @Column({ type: 'uuid', name: 'campania_id' })
  campaniaId: string;

  @ManyToOne(() => Campania, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'campania_id' })
  campania: Campania;

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
