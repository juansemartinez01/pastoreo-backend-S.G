// src/modules/pastoreo/ocupaciones/ocupaciones.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Ocupacion } from './entities/ocupacion.entity';
import { OcupacionTropa } from './entities/ocupacion-tropa.entity';
import { OcupacionesService } from './ocupaciones.service';
import { OcupacionesController } from './ocupaciones.controller';

// Ajustá imports a tu estructura real
import { Lote } from '../../maestros/lotes/entities/lote.entity';
import { Tropa } from '../../ganaderia/tropas/entities/tropa.entity';
import { Pastura } from '../../maestros/pasturas/entities/pastura.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Ocupacion, OcupacionTropa, Lote, Tropa, Pastura]),
  ],
  controllers: [OcupacionesController],
  providers: [OcupacionesService],
  exports: [OcupacionesService],
})
export class OcupacionesModule {}
