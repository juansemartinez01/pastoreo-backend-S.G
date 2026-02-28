import { Column, Entity, Index, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../../common/database/base.entity';
import { Pastura } from './pastura.entity';

@Entity('cat_pastura_precio_audit')
@Index('ix_pastura_audit_pastura', ['pasturaId'])
@Index('ix_pastura_audit_changed_at', ['changedAt'])
export class PasturaPrecioAudit extends BaseEntity {
  @Column({ type: 'uuid', name: 'pastura_id' })
  pasturaId: string;

  @ManyToOne(() => Pastura, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'pastura_id' })
  pastura: Pastura;

  @Column({ type: 'timestamptz', name: 'changed_at', default: () => 'now()' })
  changedAt: Date;

  @Column({
    type: 'numeric',
    precision: 14,
    scale: 4,
    name: 'precio_ars_anterior',
  })
  precioArsAnterior: string;

  @Column({
    type: 'numeric',
    precision: 14,
    scale: 4,
    name: 'precio_ars_nuevo',
  })
  precioArsNuevo: string;

  @Column({
    type: 'numeric',
    precision: 14,
    scale: 4,
    name: 'precio_usd_anterior',
  })
  precioUsdAnterior: string;

  @Column({
    type: 'numeric',
    precision: 14,
    scale: 4,
    name: 'precio_usd_nuevo',
  })
  precioUsdNuevo: string;

  @Column({ type: 'uuid', name: 'actor_user_id', nullable: true })
  actorUserId?: string | null;

  @Column({ type: 'varchar', length: 200, name: 'actor_email', nullable: true })
  actorEmail?: string | null;

  @Column({ type: 'varchar', length: 80, name: 'request_id', nullable: true })
  requestId?: string | null;
}
