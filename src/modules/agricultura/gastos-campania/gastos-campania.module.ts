// src/modules/agricultura/gastos-campania/gastos-campania.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { GastosCampaniaController } from './gastos-campania.controller';
import { GastosCampaniaService } from './gastos-campania.service';

import { GastoCampania } from './entities/gasto-campania.entity';
import { Campania } from '../campanias/entities/campania.entity';
import { Proveedor } from '../../maestros/proveedores/entities/proveedor.entity';
import { Categoria } from '../../maestros/categorias/entities/categoria.entity';

import { AdjuntosModule } from '../../docs/adjuntos/adjuntos.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([GastoCampania, Campania, Proveedor, Categoria]),
    AdjuntosModule,
  ],
  controllers: [GastosCampaniaController],
  providers: [GastosCampaniaService],
  exports: [GastosCampaniaService],
})
export class GastosCampaniaModule {}
