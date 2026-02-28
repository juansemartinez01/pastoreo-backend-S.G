// src/modules/maestros/lotes/entities/lote.entity.ts
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../../common/database/base.entity';
import { Establecimiento } from '../../establecimientos/entities/establecimiento.entity';
import { Pastura } from '../../pasturas/entities/pastura.entity';

export enum EstadoManualLote {
  DISPONIBLE = 'DISPONIBLE',
  OCUPADO = 'OCUPADO',
  DESCANSO = 'DESCANSO',
  NO_DISPONIBLE = 'NO_DISPONIBLE',
}

@Entity('est_lotes')
@Index('ix_lotes_tenant', ['tenant_id'])
@Index('ix_lotes_establecimiento', ['establecimientoId'])
@Index('ix_lotes_estado_manual', ['estado_manual'])
@Index('ix_lotes_pastura_actual', ['pasturaActualId'])
export class Lote extends BaseEntity {
  @Column({ type: 'uuid', name: 'establecimiento_id' })
  establecimientoId: string;

  @ManyToOne(() => Establecimiento, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'establecimiento_id' })
  establecimiento: Establecimiento;

  @Column({ type: 'varchar', length: 120 })
  nombre: string;

  @Column({ type: 'numeric', precision: 14, scale: 4 })
  hectareas: string; // numeric -> string por precisión

  @Column({ type: 'varchar', length: 200, nullable: true })
  ubicacion_texto?: string | null;

  @Column({
    type: 'enum',
    enum: EstadoManualLote,
    default: EstadoManualLote.DISPONIBLE,
  })
  estado_manual: EstadoManualLote;

  @Column({ type: 'uuid', name: 'pastura_actual_id', nullable: true })
  pasturaActualId?: string | null;

  @ManyToOne(() => Pastura, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'pastura_actual_id' })
  pasturaActual?: Pastura | null;
}
