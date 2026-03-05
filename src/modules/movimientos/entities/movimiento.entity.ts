// src/modules/movimientos/entities/movimiento.entity.ts
import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../../common/database/base.entity';

export enum AreaMovimiento {
  AGRI = 'AGRI',
  GANA = 'GANA',
}

export enum TipoMovimiento {
  ALIMENTO_INTERNO = 'ALIMENTO_INTERNO',
  // (post MVP: GASTO_LOTE, GASTO_TROPA, CIERRE, etc.)
}

@Entity('mov_movimientos')
@Index('ix_mov_fecha', ['fecha'])
@Index('ix_mov_tipo', ['tipo'])
@Index('ix_mov_source', ['sourceType', 'sourceId'])
@Index('ix_mov_group', ['groupId'])
export class Movimiento extends BaseEntity {
  @Column({ type: 'varchar', length: 10 })
  area: AreaMovimiento;

  @Column({ type: 'varchar', length: 40 })
  tipo: TipoMovimiento;

  @Column({ type: 'varchar', length: 40, name: 'source_type' })
  sourceType: string; // 'OCUPACION'

  @Column({ type: 'uuid', name: 'source_id' })
  sourceId: string; // ocupacionId

  @Column({ type: 'uuid', name: 'group_id' })
  groupId: string;

  @Column({ type: 'date' })
  fecha: string;

  @Column({ type: 'numeric', precision: 18, scale: 2, name: 'monto_ars' })
  montoArs: string;

  @Column({ type: 'numeric', precision: 18, scale: 2, name: 'monto_usd' })
  montoUsd: string;

  @Column({ type: 'numeric', precision: 14, scale: 6, name: 'tipo_cambio' })
  tipoCambio: string;

  @Column({ type: 'varchar', length: 300, nullable: true })
  descripcion?: string | null;
}
