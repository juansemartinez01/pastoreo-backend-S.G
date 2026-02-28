// src/modules/agricultura/gastos-lote/gastos-lote.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { GastosLoteController } from './gastos-lote.controller';
import { GastosLoteService } from './gastos-lote.service';
import { GastoLote } from './entities/gasto-lote.entity';

import { Lote } from '../..//maestros/lotes/entities/lote.entity';
import { Proveedor } from '../../maestros/proveedores/entities/proveedor.entity';
import { Categoria } from '../../maestros/categorias/entities/categoria.entity';

import { AdjuntosModule } from '../../docs/adjuntos/adjuntos.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([GastoLote, Lote, Proveedor, Categoria]),
    AdjuntosModule,
  ],
  controllers: [GastosLoteController],
  providers: [GastosLoteService],
  exports: [GastosLoteService],
})
export class GastosLoteModule {}
