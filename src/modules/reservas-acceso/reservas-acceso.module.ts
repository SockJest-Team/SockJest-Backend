import { Module } from '@nestjs/common';
import { ReservasAccesoService } from './reservas-acceso.service';
import { ReservasAccesoController } from './reservas-acceso.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReservasAcceso } from '../../entities/ReservasAcceso';
import { Subastas } from '../../entities/Subastas';

@Module({
  imports: [TypeOrmModule.forFeature([ReservasAcceso, Subastas])],
  controllers: [ReservasAccesoController],
  providers: [ReservasAccesoService],
})
export class ReservasAccesoModule {}
