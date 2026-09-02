import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CalificacionesService } from './calificaciones.service';
import { CalificacionesController } from './calificaciones.controller';
import { Calificaciones } from '../../entities/Calificaciones';
import { Subastas } from '../../entities/Subastas';

@Module({
  imports: [TypeOrmModule.forFeature([Calificaciones, Subastas])],
  controllers: [CalificacionesController],
  providers: [CalificacionesService],
})
export class CalificacionesModule {}
