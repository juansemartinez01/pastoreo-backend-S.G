// src/modules/ganaderia/eventos-muerte/eventos-muerte.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { EventoMuerte } from './entities/evento-muerte.entity';
import { Tropa } from '../tropas/entities/tropa.entity';

import { EventosMuerteService } from './eventos-muerte.service';
import { EventosMuerteController } from './eventos-muerte.controller';

@Module({
  imports: [TypeOrmModule.forFeature([EventoMuerte, Tropa])],
  controllers: [EventosMuerteController],
  providers: [EventosMuerteService],
  exports: [EventosMuerteService],
})
export class EventosMuerteModule {}
