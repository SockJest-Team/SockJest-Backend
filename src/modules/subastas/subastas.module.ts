import { Module } from '@nestjs/common';
import { SubastasService } from './subastas.service';
import { SubastasController } from './subastas.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Subastas } from '../../entities/Subastas';
import { CommonModule } from '../../common/common.module';

@Module({
  imports: [TypeOrmModule.forFeature([Subastas]), CommonModule],
  controllers: [SubastasController],
  providers: [SubastasService],
})
export class SubastasModule {}
