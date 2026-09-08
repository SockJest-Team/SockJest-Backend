import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Usuarios } from '../../entities/Usuarios';
import { Subastas } from '../../entities/Subastas';
import { Calificaciones } from '../../entities/Calificaciones';
import { VendedoresController } from './vendedores.controller';
import { VendedoresService } from './vendedores.service';

@Module({
  imports: [TypeOrmModule.forFeature([Usuarios, Subastas, Calificaciones])],
  controllers: [VendedoresController],
  providers: [VendedoresService],
})
export class VendedoresModule {}
