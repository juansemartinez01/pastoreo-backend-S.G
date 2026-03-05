// src/modules/ganaderia/divisiones-tropa/divisiones-tropa.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DivisionTropa } from './entities/division-tropa.entity';
import { Tropa } from '../tropas/entities/tropa.entity';

import { DivisionesTropaService } from './divisiones-tropa.service';
import { DivisionesTropaController } from './divisiones-tropa.controller';

@Module({
  imports: [TypeOrmModule.forFeature([DivisionTropa, Tropa])],
  controllers: [DivisionesTropaController],
  providers: [DivisionesTropaService],
  exports: [DivisionesTropaService],
})
export class DivisionesTropaModule {}
