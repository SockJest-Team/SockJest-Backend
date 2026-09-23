import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SubastasService } from './subastas.service';
import { SubastasController } from './subastas.controller';
import { ImagenesService } from './imagenes.service'; // ← FALTABA
import { Subastas } from '../../entities/Subastas';
import { SubastaImagenes } from '../../entities/SubastaImagenes';
import { Categorias } from '../../entities/Categorias';
import { ReservasAcceso } from '../../entities/ReservasAcceso';
import { SubastaHistorialEstados } from '../../entities/SubastaHistorialEstados';
import { Notificaciones } from '../../entities/Notificaciones';
import { ReportesSubasta } from '../../entities/ReportesSubasta';
import { CommonModule } from '../../common/common.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Subastas,
      SubastaImagenes,
      Categorias,
      ReservasAcceso,
      SubastaHistorialEstados,
      Notificaciones,
      ReportesSubasta,
    ]),
    CommonModule,
    NotificationsModule,
  ],
  controllers: [SubastasController],
  providers: [SubastasService, ImagenesService],
  exports: [SubastasService],
})
export class SubastasModule {}
