// src/modules/docs/adjuntos/adjuntos.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Adjunto } from './entities/adjunto.entity';
import { AdjuntosService } from './adjuntos.service';

@Module({
  imports: [TypeOrmModule.forFeature([Adjunto])],
  providers: [AdjuntosService],
  exports: [AdjuntosService],
})
export class AdjuntosModule {}
