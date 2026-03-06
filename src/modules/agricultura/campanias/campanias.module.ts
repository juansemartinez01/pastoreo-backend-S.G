// src/modules/agricultura/campanias/campanias.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CampaniasController } from './campanias.controller';
import { CampaniasService } from './campanias.service';

import { Campania } from './entities/campania.entity';
import { CampaniaEstadoHistorial } from './entities/campania-estado-historial.entity';
import { Lote } from '../../maestros/lotes/entities/lote.entity';
import { Pastura } from '../../maestros/pasturas/entities/pastura.entity';
import { AuditModule } from '../../audit/audit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Campania,
      CampaniaEstadoHistorial,
      Lote,
      Pastura,
    ]),
    AuditModule,
  ],
  controllers: [CampaniasController],
  providers: [CampaniasService],
  exports: [CampaniasService],
})
export class CampaniasModule {}
