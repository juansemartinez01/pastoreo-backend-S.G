// src/modules/docs/adjuntos/entities/adjunto.entity.ts
import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../../../common/database/base.entity';

@Entity('docs_adjuntos')
@Index('ix_adjuntos_owner', ['ownerType', 'ownerId'])
@Index('ix_adjuntos_tenant', ['tenant_id'])
export class Adjunto extends BaseEntity {
  @Column({ type: 'varchar', length: 60, name: 'owner_type' })
  ownerType: string; // ej: 'AG_GASTO_LOTE', 'GA_GASTO_TROPA'

  @Column({ type: 'uuid', name: 'owner_id' })
  ownerId: string;

  // referenciamos lo que ya te devuelve Files / S3
  @Column({ type: 'varchar', length: 200, name: 'asset_id', nullable: true })
  assetId?: string | null;

  @Column({ type: 'varchar', length: 500, name: 'url' })
  url: string;

  @Column({ type: 'varchar', length: 120, name: 'mime', nullable: true })
  mime?: string | null;

  @Column({
    type: 'varchar',
    length: 260,
    name: 'original_name',
    nullable: true,
  })
  originalName?: string | null;

  @Column({ type: 'bigint', name: 'size_bytes', nullable: true })
  sizeBytes?: string | null;
}
