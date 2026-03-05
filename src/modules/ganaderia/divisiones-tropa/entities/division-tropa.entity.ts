// src/modules/ganaderia/divisiones-tropa/entities/division-tropa.entity.ts
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../../common/database/base.entity';
import { Tropa } from '../../tropas/entities/tropa.entity';

@Entity('ga_divisiones_tropa')
@Index('ix_div_tenant', ['tenant_id'])
@Index('ix_div_fecha', ['fecha'])
@Index('ix_div_origen', ['tropaOrigenId'])
@Index('ix_div_destino', ['tropaDestinoId'])
@Index('ix_div_origen_fecha', ['tropaOrigenId', 'fecha'])
export class DivisionTropa extends BaseEntity {
  @Column({ type: 'uuid', name: 'tropa_origen_id' })
  tropaOrigenId: string;

  @ManyToOne(() => Tropa, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'tropa_origen_id' })
  tropaOrigen: Tropa;

  @Column({ type: 'uuid', name: 'tropa_destino_id' })
  tropaDestinoId: string;

  @ManyToOne(() => Tropa, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'tropa_destino_id' })
  tropaDestino: Tropa;

  @Column({ type: 'date' })
  fecha: string; // YYYY-MM-DD

  @Column({ type: 'int', name: 'cabezas_transferidas' })
  cabezasTransferidas: number;

  @Column({
    type: 'numeric',
    precision: 14,
    scale: 4,
    name: 'peso_prom_destino',
  })
  pesoPromDestino: string;

  @Column({
    type: 'numeric',
    precision: 14,
    scale: 4,
    name: 'peso_prom_origen_anterior',
  })
  pesoPromOrigenAnterior: string;

  @Column({
    type: 'numeric',
    precision: 14,
    scale: 4,
    name: 'peso_prom_origen_nuevo',
    nullable: true,
  })
  pesoPromOrigenNuevo?: string | null;

  @Column({ type: 'varchar', length: 300, nullable: true })
  notas?: string | null;

  // MVP: el destino es creado por esta división (para poder deshacer)
  @Column({ type: 'boolean', name: 'destino_creado', default: true })
  destinoCreado: boolean;
}
