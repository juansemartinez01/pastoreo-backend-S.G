// src/modules/pastoreo/ocupaciones/entities/ocupacion-tropa.entity.ts
import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../../../common/database/base.entity';

@Entity('pas_ocupacion_tropas')
@Index('ux_ocup_tropa', ['ocupacionId', 'tropaId'], { unique: true })
@Index('ix_ocup_tropa_ocup', ['ocupacionId'])
@Index('ix_ocup_tropa_tropa', ['tropaId'])
export class OcupacionTropa extends BaseEntity {
  @Column({ type: 'uuid', name: 'ocupacion_id' })
  ocupacionId: string;

  @Column({ type: 'uuid', name: 'tropa_id' })
  tropaId: string;

  @Column({ type: 'int', name: 'cabezas_inicio' })
  cabezasInicio: number;

  @Column({ type: 'int', name: 'cabezas_fin', nullable: true })
  cabezasFin?: number | null;

  @Column({ type: 'numeric', precision: 14, scale: 4, name: 'peso_inicio' })
  pesoInicio: string;

  @Column({
    type: 'numeric',
    precision: 14,
    scale: 4,
    name: 'peso_fin',
    nullable: true,
  })
  pesoFin?: string | null;

  @Column({ type: 'numeric', precision: 14, scale: 6, name: 'aumento_diario' })
  aumentoDiario: string;

  @Column({ type: 'numeric', precision: 14, scale: 6, name: 'factor_engorde' })
  factorEngorde: string;
}
