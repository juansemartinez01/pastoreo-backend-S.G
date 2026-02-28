// src/modules/pastoreo/ocupaciones/entities/ocupacion.entity.ts
import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../../../common/database/base.entity';
import { EstadoOcupacion } from './ocupacion.types';

@Entity('pas_ocupaciones')
@Index('ix_ocup_lote', ['loteId'])
@Index('ix_ocup_estado', ['estado'])
@Index('ix_ocup_fechas', ['fechaDesde', 'fechaHasta'])
export class Ocupacion extends BaseEntity {
  @Column({ type: 'uuid', name: 'lote_id' })
  loteId: string;

  @Column({ type: 'date', name: 'fecha_desde' })
  fechaDesde: string;

  @Column({ type: 'date', name: 'fecha_hasta', nullable: true })
  fechaHasta?: string | null;

  @Column({ type: 'varchar', length: 20, default: EstadoOcupacion.ABIERTA })
  estado: EstadoOcupacion;

  // snapshot opcional de pastura
  @Column({ type: 'uuid', name: 'pastura_id_snapshot', nullable: true })
  pasturaIdSnapshot?: string | null;

  @Column({ type: 'varchar', length: 300, nullable: true })
  notas?: string | null;
}
