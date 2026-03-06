// src/modules/agricultura/campanias/entities/campania-estado-historial.entity.ts
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../../common/database/base.entity';
import { Campania, EstadoCampania } from './campania.entity';

@Entity('ag_campanias_estado_historial')
@Index('ix_camp_hist_tenant', ['tenant_id'])
@Index('ix_camp_hist_campania', ['campaniaId'])
@Index('ix_camp_hist_estado', ['estado'])
@Index('ix_camp_hist_fecha_desde', ['fechaDesde'])
@Index('ix_camp_hist_fecha_hasta', ['fechaHasta'])
export class CampaniaEstadoHistorial extends BaseEntity {
  @Column({ type: 'uuid', name: 'campania_id' })
  campaniaId: string;

  @ManyToOne(() => Campania, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'campania_id' })
  campania: Campania;

  @Column({
    type: 'enum',
    enum: EstadoCampania,
    enumName: 'ag_campanias_estado_actual_enum',
  })
  estado: EstadoCampania;

  @Column({ type: 'date', name: 'fecha_desde' })
  fechaDesde: string;

  @Column({ type: 'date', name: 'fecha_hasta', nullable: true })
  fechaHasta?: string | null;

  @Column({ type: 'varchar', length: 300, nullable: true })
  observaciones?: string | null;

  @Column({ type: 'uuid', name: 'actor_user_id', nullable: true })
  actorUserId?: string | null;

  @Column({ type: 'varchar', length: 160, name: 'actor_email', nullable: true })
  actorEmail?: string | null;

  @Column({ type: 'varchar', length: 100, name: 'request_id', nullable: true })
  requestId?: string | null;
}
