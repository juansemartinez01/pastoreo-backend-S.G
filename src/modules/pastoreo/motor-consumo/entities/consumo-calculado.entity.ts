// src/modules/pastoreo/motor-consumo/entities/consumo-calculado.entity.ts
import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../../../common/database/base.entity';

@Entity('pas_consumos_calculados')
@Index('ix_cons_ocup', ['ocupacionId'])
@Index('ix_cons_tropa', ['tropaId'])
@Index('ix_cons_fechas', ['fechaDesde', 'fechaHasta'])
export class ConsumoCalculado extends BaseEntity {
  @Column({ type: 'uuid', name: 'ocupacion_id' })
  ocupacionId: string;

  @Column({ type: 'uuid', name: 'tropa_id' })
  tropaId: string;

  @Column({ type: 'date', name: 'fecha_desde' })
  fechaDesde: string;

  @Column({ type: 'date', name: 'fecha_hasta' })
  fechaHasta: string;

  @Column({ type: 'numeric', precision: 18, scale: 4, name: 'kg_consumidos' })
  kgConsumidos: string;

  @Column({
    type: 'numeric',
    precision: 14,
    scale: 4,
    name: 'precio_kg_ars_snapshot',
  })
  precioKgArsSnapshot: string;

  @Column({
    type: 'numeric',
    precision: 14,
    scale: 4,
    name: 'precio_kg_usd_snapshot',
  })
  precioKgUsdSnapshot: string;

  @Column({
    type: 'numeric',
    precision: 14,
    scale: 6,
    name: 'tipo_cambio_snapshot',
  })
  tipoCambioSnapshot: string;

  @Column({ type: 'int', name: 'regla_version' })
  reglaVersion: number;

  @Column({ type: 'jsonb', name: 'datos_base' })
  datosBase: any;
}
