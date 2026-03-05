// src/modules/ganaderia/eventos-muerte/entities/evento-muerte.entity.ts
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../../common/database/base.entity';
import { Tropa } from '../../tropas/entities/tropa.entity';

@Entity('ga_eventos_muerte')
@Index('ix_muerte_tenant', ['tenant_id'])
@Index('ix_muerte_tropa', ['tropaId'])
@Index('ix_muerte_fecha', ['fecha'])
@Index('ix_muerte_tropa_fecha', ['tropaId', 'fecha'])
export class EventoMuerte extends BaseEntity {
  @Column({ type: 'uuid', name: 'tropa_id' })
  tropaId: string;

  @ManyToOne(() => Tropa, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'tropa_id' })
  tropa: Tropa;

  @Column({ type: 'date' })
  fecha: string; // YYYY-MM-DD

  @Column({ type: 'int' })
  cabezas: number;

  @Column({ type: 'varchar', length: 300, nullable: true })
  notas?: string | null;
}
