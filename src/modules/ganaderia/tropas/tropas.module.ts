// src/modules/ganaderia/tropas/tropas.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Tropa } from './entities/tropa.entity';
import { TropasService } from './tropas.service';
import { TropasController } from './tropas.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Tropa])],
  controllers: [TropasController],
  providers: [TropasService],
  exports: [TropasService],
})
export class TropasModule {}
