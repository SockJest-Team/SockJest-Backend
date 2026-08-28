import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CategoriasModule } from './modules/categorias/categorias.module';
import { RolesModule } from './modules/roles/roles.module';
import { UsuariosModule } from './modules/usuarios/usuarios.module';
import { AuthModule } from './modules/auth/auth.module';
import { SubastasModule } from './modules/subastas/subastas.module';
import { SesionesModule } from './modules/sesiones/sesiones.module';
import { ReservasAccesoModule } from './modules/reservas-acceso/reservas-acceso.module';
import { CommonModule } from './common/common.module';
import { EntitiesModule } from './entities/entities.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('DB_HOST'),
        port: config.get<number>('DB_PORT'),
        username: config.get('DB_USERNAME'),
        password: config.get('DB_PASSWORD'),
        database: config.get('DB_DATABASE'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: false, // NUNCA true en producción
        ssl: config.get('DB_SSL') === 'true'
          ? { rejectUnauthorized: false } // Supabase usa certificados propios
          : false,
        extra: {
          max: 10,               // máximo de conexiones en el pool
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 5000,
        },
        retryAttempts: 5,        // reintenta si Supabase no responde al iniciar
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
  ],
})
export class AppModule {}