import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SesionesService } from './sesiones.service';
import { SesionesController } from './sesiones.controller';
import { Sesiones } from '../../entities/Sesiones';

@Module({
  imports: [TypeOrmModule.forFeature([Sesiones])],
  controllers: [SesionesController],
  providers: [SesionesService],
  exports: [SesionesService],
})
export class SesionesModule {}