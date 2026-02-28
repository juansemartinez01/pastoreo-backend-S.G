// src/modules/docs/adjuntos/adjuntos.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Adjunto } from './entities/adjunto.entity';
import { CreateAdjuntoDto } from './dto/create-adjunto.dto';

@Injectable()
export class AdjuntosService {
  constructor(
    @InjectRepository(Adjunto)
    private readonly repo: Repository<Adjunto>,
  ) {}

  async addMany(
    ownerType: string,
    ownerId: string,
    adjuntos: CreateAdjuntoDto[],
  ) {
    if (!adjuntos?.length) return [];

    const rows = adjuntos.map((a) =>
      this.repo.create({
        ownerType,
        ownerId,
        assetId: a.assetId ?? null,
        url: a.url,
        mime: a.mime ?? null,
        originalName: a.originalName ?? null,
        sizeBytes: a.sizeBytes !== undefined ? String(a.sizeBytes) : null,
      } as any),
    ).flat();

    return this.repo.save(rows);
  }

  async listByOwner(ownerType: string, ownerId: string) {
    return this.repo.find({
      where: { ownerType, ownerId } as any,
      order: { created_at: 'DESC' } as any,
    });
  }
}
