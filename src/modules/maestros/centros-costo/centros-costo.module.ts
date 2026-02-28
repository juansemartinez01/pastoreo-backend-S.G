// src/modules/maestros/centros-costo/centros-costo.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CentroCosto } from './entities/centro-costo.entity';
import { CentrosCostoService } from './centros-costo.service';
import { CentrosCostoController } from './centros-costo.controller';

@Module({
  imports: [TypeOrmModule.forFeature([CentroCosto])],
  controllers: [CentrosCostoController],
  providers: [CentrosCostoService],
  exports: [CentrosCostoService],
})
export class CentrosCostoModule {}
