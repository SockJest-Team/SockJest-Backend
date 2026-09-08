import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Pagos } from '../../entities/Pagos';
import { Usuarios } from '../../entities/Usuarios';
import { CommonModule } from '../../common/common.module';
import { ReportesController } from './reportes.controller';
import { ReportesService } from './reportes.service';

@Module({
  imports: [TypeOrmModule.forFeature([Pagos, Usuarios]), CommonModule],
  controllers: [ReportesController],
  providers: [ReportesService],
})
export class ReportesModule {}
