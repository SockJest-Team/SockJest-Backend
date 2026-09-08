import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReservasAcceso } from '../../entities/ReservasAcceso';
import { Subastas } from '../../entities/Subastas';
import { NotificationsModule } from '../notifications/notifications.module';
import { ReservasController } from './reservas.controller';
import { ReservasService } from './reservas.service';
import { Usuarios } from '../../entities/Usuarios';

@Module({
  imports: [
    TypeOrmModule.forFeature([ReservasAcceso, Subastas, Usuarios]),
    NotificationsModule,
  ],
  controllers: [ReservasController],
  providers: [ReservasService],
})
export class ReservasGestionModule {}
