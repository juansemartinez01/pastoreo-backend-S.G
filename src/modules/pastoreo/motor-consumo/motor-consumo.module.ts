import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { MotorConsumoService } from './motor-consumo.service';
import { ConsumoCalculado } from './entities/consumo-calculado.entity';
import { Movimiento } from '../../movimientos/entities/movimiento.entity';

// Ajustá imports según tu estructura real
import { Ocupacion } from '../ocupaciones/entities/ocupacion.entity';
import { OcupacionTropa } from '../ocupaciones/entities/ocupacion-tropa.entity';
import { Pastura } from '../../maestros/pasturas/entities/pastura.entity';
import { EventoMuerte } from '../../ganaderia/eventos-muerte/entities/evento-muerte.entity';
import { DivisionTropa } from '../../ganaderia/divisiones-tropa/entities/division-tropa.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ConsumoCalculado,
      Movimiento,
      Ocupacion,
      OcupacionTropa,
      Pastura,
      EventoMuerte,
      DivisionTropa,
    ]),
  ],
  providers: [MotorConsumoService],
  exports: [MotorConsumoService], // 👈 MUY IMPORTANTE
})
export class MotorConsumoModule {}
