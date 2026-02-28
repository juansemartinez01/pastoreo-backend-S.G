// src/modules/maestros/establecimientos/establecimientos.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Establecimiento } from './entities/establecimiento.entity';
import { Lote } from '../lotes/entities/lote.entity';

import { EstablecimientosController } from './establecimientos.controller';
import { EstablecimientosService } from './establecimientos.service';

@Module({
  imports: [TypeOrmModule.forFeature([Establecimiento, Lote])],
  controllers: [EstablecimientosController],
  providers: [EstablecimientosService],
  exports: [EstablecimientosService],
})
export class EstablecimientosModule {}
