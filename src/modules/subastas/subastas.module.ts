import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SubastasService } from './subastas.service';
import { SubastasController } from './subastas.controller';
import { Subastas } from '../../entities/Subastas';
import { SubastaImagenes } from '../../entities/SubastaImagenes';
import { SubastaHistorialEstados } from '../../entities/SubastaHistorialEstados';
import { Notificaciones } from '../../entities/Notificaciones';
import { ReportesSubasta } from '../../entities/ReportesSubasta';
import { CommonModule } from '../../common/common.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Subastas,
      SubastaImagenes,
      SubastaHistorialEstados,
      Notificaciones,
      ReportesSubasta,
    ]),
    CommonModule,
  ],
  controllers: [SubastasController],
  providers: [SubastasService],
  exports: [SubastasService],
})
export class SubastasModule {}
