// src/modules/maestros/categorias/categorias.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Categoria } from './entities/categoria.entity';
import { CentroCosto } from '../centros-costo/entities/centro-costo.entity';

import { CategoriasController } from './categorias.controller';
import { CategoriasService } from './categorias.service';

import { CentrosCostoModule } from '../centros-costo/centros-costo.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Categoria, CentroCosto]),
    CentrosCostoModule,
  ],
  controllers: [CategoriasController],
  providers: [CategoriasService],
  exports: [CategoriasService],
})
export class CategoriasModule {}
