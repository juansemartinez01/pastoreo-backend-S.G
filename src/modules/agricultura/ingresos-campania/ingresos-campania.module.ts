// src/modules/agricultura/ingresos-campania/ingresos-campania.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { IngresosCampaniaController } from './ingresos-campania.controller';
import { IngresosCampaniaService } from './ingresos-campania.service';

import { IngresoCampania } from './entities/ingreso-campania.entity';
import { Campania } from '../campanias/entities/campania.entity';
import { Categoria } from '../../maestros/categorias/entities/categoria.entity';

import { AdjuntosModule } from '../../docs/adjuntos/adjuntos.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([IngresoCampania, Campania, Categoria]),
    AdjuntosModule,
  ],
  controllers: [IngresosCampaniaController],
  providers: [IngresosCampaniaService],
  exports: [IngresosCampaniaService],
})
export class IngresosCampaniaModule {}
