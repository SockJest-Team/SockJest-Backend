import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Apelaciones } from '../../entities/Apelaciones';
import { Usuarios } from '../../entities/Usuarios';
import { ApelacionesService } from './apelaciones.service';
import { ApelacionesController } from './apelaciones.controller';
import { CommonModule } from '../../common/common.module';

@Module({
  imports: [TypeOrmModule.forFeature([Apelaciones, Usuarios]), CommonModule],
  controllers: [ApelacionesController],
  providers: [ApelacionesService],
  exports: [ApelacionesService],
})
export class ApelacionesModule {}
