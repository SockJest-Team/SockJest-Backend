import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SubastaHistorialEstados } from '../../entities/SubastaHistorialEstados';
import { CommonModule } from '../../common/common.module';
import { HistorialController } from './historial.controller';
import { HistorialService } from './historial.service';

@Module({
  imports: [TypeOrmModule.forFeature([SubastaHistorialEstados]), CommonModule],
  controllers: [HistorialController],
  providers: [HistorialService],
})
export class HistorialModule {}
