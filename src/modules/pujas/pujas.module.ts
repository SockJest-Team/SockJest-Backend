import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Pujas } from '../../entities/Pujas';
import { Subastas } from '../../entities/Subastas';
import { ReservasAcceso } from '../../entities/ReservasAcceso';
import { CommonModule } from '../../common/common.module';
import { PujasController } from './pujas.controller';
import { PujasService } from './pujas.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Pujas, Subastas, ReservasAcceso]),
    CommonModule,
  ],
  controllers: [PujasController],
  providers: [PujasService],
  exports: [PujasService],
})
export class PujasModule {}
