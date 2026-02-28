// src/modules/ganaderia/gastos-tropa/gastos-tropa.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { GastosTropaController } from './gastos-tropa.controller';
import { GastosTropaService } from './gastos-tropa.service';
import { GastoTropa } from './entities/gasto-tropa.entity';

import { Tropa } from '../tropas/entities/tropa.entity';
import { Proveedor } from '../../maestros/proveedores/entities/proveedor.entity';
import { Categoria } from '../../maestros/categorias/entities/categoria.entity';

import { AdjuntosModule } from '../../docs/adjuntos/adjuntos.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([GastoTropa, Tropa, Proveedor, Categoria]),
    AdjuntosModule,
  ],
  controllers: [GastosTropaController],
  providers: [GastosTropaService],
  exports: [GastosTropaService],
})
export class GastosTropaModule {}
