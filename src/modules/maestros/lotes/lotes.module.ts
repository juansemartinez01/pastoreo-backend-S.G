// src/modules/maestros/lotes/lotes.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Lote } from './entities/lote.entity';
import { Establecimiento } from '../establecimientos/entities/establecimiento.entity';
import { Pastura } from '../pasturas/entities/pastura.entity';

import { LotesController } from './lotes.controller';
import { LotesService } from './lotes.service';

@Module({
  imports: [TypeOrmModule.forFeature([Lote, Establecimiento, Pastura])],
  controllers: [LotesController],
  providers: [LotesService],
  exports: [LotesService],
})
export class LotesModule {}
