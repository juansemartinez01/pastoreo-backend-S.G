// src/modules/ganaderia/tropas/entities/tropa.entity.ts
import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../../../common/database/base.entity';
import { EstadoTropa } from '../dto/create-tropa.dto';

@Entity('ga_tropas')
@Index('ux_tropa_codigo_tenant', ['tenant_id', 'codigo'], { unique: true })
@Index('ix_tropa_nombre', ['nombre'])
@Index('ix_tropa_estado', ['estado'])
export class Tropa extends BaseEntity {
  @Column({ type: 'varchar', length: 40 })
  codigo: string;

  @Column({ type: 'varchar', length: 120 })
  nombre: string;

  @Column({ type: 'varchar', length: 20, default: EstadoTropa.ABIERTA })
  estado: EstadoTropa;

  @Column({ type: 'int', default: 0, name: 'cabezas_actuales' })
  cabezasActuales: number;

  @Column({
    type: 'numeric',
    precision: 14,
    scale: 4,
    default: 0,
    name: 'peso_prom_actual',
  })
  pesoPromActual: string; // numeric -> string en TS

  @Column({ type: 'varchar', length: 300, nullable: true })
  notas?: string | null;
}
