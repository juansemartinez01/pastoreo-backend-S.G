import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Pastura } from './entities/pastura.entity';
import { PasturaPrecioAudit } from './entities/pastura-precio-audit.entity';

import { PasturasService } from './pasturas.service';
import { PasturasController } from './pasturas.controller';

import { AuditModule } from '../../audit/audit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Pastura, PasturaPrecioAudit]),
    AuditModule,
  ],
  controllers: [PasturasController],
  providers: [PasturasService],
  exports: [PasturasService],
})
export class PasturasModule {}
