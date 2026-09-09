import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmailModule } from './modules/email/email.module';
import { CategoriasModule } from './modules/categorias/categorias.module';
import { RolesModule } from './modules/roles/roles.module';
import { UsuariosModule } from './modules/usuarios/usuarios.module';
import { AuthModule } from './modules/auth/auth.module';
import { SubastasModule } from './modules/subastas/subastas.module';
import { SesionesModule } from './modules/sesiones/sesiones.module';
import { ReservasAccesoModule } from './modules/reservas-acceso/reservas-acceso.module';
import { CommonModule } from './common/common.module';
import { EntitiesModule } from './entities/entities.module';
import { AuctionModule } from './modules/auction/auction.module';
import { ScheduleModule } from '@nestjs/schedule';
import { BidsModule } from './modules/bids/bids.module';
import { CalificacionesModule } from './modules/calificaciones/calificaciones.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { PagosModule } from './modules/pagos/pagos.module';
import { PujasModule } from './modules/pujas/pujas.module';
import { SchedulerModule } from './modules/scheduler/scheduler.module';
import { SupabaseModule } from './config/supabase.module';
import { HistorialModule } from './modules/historial/historial.module';
import { VendedoresModule } from './modules/vendedores/vendedores.module';
import { ReservasGestionModule } from './modules/reservas-gestion/reservas.module';
import { BandejaModule } from './modules/bandeja/bandeja.module';
import { ReportesModule } from './modules/reportes/reportes.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    EmailModule,
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('DB_HOST'),
        port: config.get<number>('DB_PORT'),
        username: config.get('DB_USERNAME'),
        password: config.get('DB_PASSWORD'),
        database: config.get<string>('DB_NAME') || 'postgres',
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: false,
        ssl:
          config.get('DB_SSL') === 'true'
            ? { rejectUnauthorized: false }
            : false,
        extra: {
          max: 10, // máximo de conexiones en el pool
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 5000,
        },
        retryAttempts: 5, // reintenta si Supabase no responde al iniciar
        retryDelay: 3000,
        autoLoadEntities: true,
      }),
    }),
    EntitiesModule,
    CategoriasModule,
    RolesModule,
    UsuariosModule,
    AuthModule,
    SubastasModule,
    SesionesModule,
    ReservasAccesoModule,
    CommonModule,
    AuctionModule,
    SchedulerModule,
    ScheduleModule.forRoot(),
    BidsModule,
    CalificacionesModule,
    NotificationsModule,
    PujasModule,
    PagosModule,
    SchedulerModule,
    SupabaseModule,
    HistorialModule,
    VendedoresModule,
    ReservasGestionModule,
    BandejaModule,
    ReportesModule,
  ],
})
export class AppModule {}
