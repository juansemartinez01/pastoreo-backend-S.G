// src/modules/agricultura/campanias/entities/campania.entity.ts
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { BaseEntity } from '../../../../common/database/base.entity';
import { Lote } from '../../../maestros/lotes/entities/lote.entity';
import { Pastura } from '../../../maestros/pasturas/entities/pastura.entity';
import { CampaniaEstadoHistorial } from './campania-estado-historial.entity';

export enum EstadoCampania {
  BORRADOR = 'BORRADOR',
  DISPONIBLE = 'DISPONIBLE',
  IMPLANTADA = 'IMPLANTADA',
  EN_CRECIMIENTO = 'EN_CRECIMIENTO',
  LISTA = 'LISTA',
  OCUPADA = 'OCUPADA',
  DESCANSO = 'DESCANSO',
  CERRADA = 'CERRADA',
}

@Entity('ag_campanias')
@Index('ix_campanias_tenant', ['tenant_id'])
@Index('ix_campanias_lote', ['loteId'])
@Index('ix_campanias_pastura', ['pasturaId'])
@Index('ix_campanias_estado', ['estadoActual'])
@Index('ix_campanias_fecha_inicio', ['fechaInicio'])
@Index('ix_campanias_fecha_cierre', ['fechaCierre'])
export class Campania extends BaseEntity {
  @Column({ type: 'uuid', name: 'lote_id' })
  loteId: string;

  @ManyToOne(() => Lote, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'lote_id' })
  lote: Lote;

  @Column({ type: 'uuid', name: 'pastura_id' })
  pasturaId: string;

  @ManyToOne(() => Pastura, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'pastura_id' })
  pastura: Pastura;

  @Column({ type: 'varchar', length: 140 })
  nombre: string;

  @Column({ type: 'date', name: 'fecha_inicio' })
  fechaInicio: string;

  @Column({ type: 'date', name: 'fecha_cierre', nullable: true })
  fechaCierre?: string | null;

  @Column({
    type: 'enum',
    enum: EstadoCampania,
    enumName: 'ag_campanias_estado_actual_enum',
    name: 'estado_actual',
    default: EstadoCampania.BORRADOR,
  })
  estadoActual: EstadoCampania;

  @Column({ type: 'varchar', length: 300, nullable: true })
  notas?: string | null;

  // snapshots opcionales útiles para histórico/reportes
  @Column({ type: 'varchar', length: 120, name: 'lote_nombre_snapshot' })
  loteNombreSnapshot: string;

  @Column({ type: 'varchar', length: 120, name: 'pastura_nombre_snapshot' })
  pasturaNombreSnapshot: string;

  @Column({
    type: 'numeric',
    precision: 14,
    scale: 4,
    name: 'hectareas_snapshot',
  })
  hectareasSnapshot: string;

  // resumen económico congelado al cierre
  @Column({
    type: 'numeric',
    precision: 14,
    scale: 4,
    name: 'total_gastos_ars',
    default: 0,
  })
  totalGastosArs: string;

  @Column({
    type: 'numeric',
    precision: 14,
    scale: 4,
    name: 'total_gastos_usd',
    default: 0,
  })
  totalGastosUsd: string;

  @Column({
    type: 'numeric',
    precision: 14,
    scale: 4,
    name: 'total_ingresos_ars',
    default: 0,
  })
  totalIngresosArs: string;

  @Column({
    type: 'numeric',
    precision: 14,
    scale: 4,
    name: 'total_ingresos_usd',
    default: 0,
  })
  totalIngresosUsd: string;

  @Column({
    type: 'numeric',
    precision: 14,
    scale: 4,
    name: 'resultado_ars',
    default: 0,
  })
  resultadoArs: string;

  @Column({
    type: 'numeric',
    precision: 14,
    scale: 4,
    name: 'resultado_usd',
    default: 0,
  })
  resultadoUsd: string;

  @Column({
    type: 'jsonb',
    name: 'resumen_cierre',
    nullable: true,
    default: null,
  })
  resumenCierre?: Record<string, any> | null;

  @OneToMany(() => CampaniaEstadoHistorial, (h) => h.campania)
  historialEstados: CampaniaEstadoHistorial[];
}
