import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DbModule } from './infra/db/db.module';
import { HealthModule } from './infra/health/health.module';
import configuration from './config/configuration';
import { validateEnv } from './config/env.validation';
import { LoggingModule } from './infra/logging/logging.module';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { HttpLoggingInterceptor } from './common/interceptors/http-logging.interceptor';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { AdminModule } from './modules/admin/admin.module';
import { AuditModule } from './modules/audit/audit.module';
import { FilesModule } from './modules/files/files.module';
import { TenancyModule } from './modules/tenancy/tenancy.module';

import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ObservabilityModule } from './infra/observability/observability.module';
import { PasturasModule } from './modules/maestros/pasturas/pasturas.module';
import { EstablecimientosModule } from './modules/maestros/establecimientos/establecimientos.module';
import { LotesModule } from './modules/maestros/lotes/lotes.module';
import { ProveedoresModule } from './modules/maestros/proveedores/proveedores.module';
import { CentrosCostoModule } from './modules/maestros/centros-costo/centros-costo.module';
import { CategoriasModule } from './modules/maestros/categorias/categorias.module';
import { GastosLoteModule } from './modules/agricultura/gastos-lote/gastos-lote.module';
import { GastosTropaModule } from './modules/ganaderia/gastos-tropa/gastos-tropa.module';
import { TropasModule } from './modules/ganaderia/tropas/tropas.module';
import { OcupacionesModule } from './modules/pastoreo/ocupaciones/ocupaciones.module';
import { EventosMuerteModule } from './modules/ganaderia/eventos-muerte/eventos-muerte.module';
import { DivisionesTropaModule } from './modules/ganaderia/divisiones-tropa/divisiones-tropa.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate: validateEnv,
      envFilePath: ['.env.local', '.env'],
    }),

    // ✅ Rate limit base (global)
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => {
        const ttl = Number(cfg.get('THROTTLE_TTL') ?? 60); // seconds
        const limit = Number(cfg.get('THROTTLE_LIMIT') ?? 300); // req/ttl por IP
        return [{ ttl, limit }];
      },
    }),

    LoggingModule,
    DbModule,
    HealthModule,
    UsersModule,
    AuthModule,
    AdminModule,
    AuditModule,
    FilesModule,
    TenancyModule,
    ObservabilityModule,

    //Pastoreo
    PasturasModule,
    EstablecimientosModule,
    LotesModule,
    ProveedoresModule,
    CentrosCostoModule,
    CategoriasModule,
    GastosLoteModule,
    GastosTropaModule,
    TropasModule,
    OcupacionesModule,
    EventosMuerteModule,
    DivisionesTropaModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_INTERCEPTOR, useClass: HttpLoggingInterceptor },

    // ✅ Guard global de throttling (se puede ajustar por endpoint con @Throttle)
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
