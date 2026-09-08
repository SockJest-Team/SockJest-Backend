// bandeja.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notificaciones } from '../../entities/Notificaciones';
import { BandejaController } from './bandeja.controller';
import { BandejaService } from './bandeja.service';

@Module({
  imports: [TypeOrmModule.forFeature([Notificaciones])],
  controllers: [BandejaController],
  providers: [BandejaService],
})
export class BandejaModule {}
