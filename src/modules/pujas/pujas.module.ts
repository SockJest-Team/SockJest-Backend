import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PujasService } from './pujas.service';
import { PujasController } from './pujas.controller';
import { Pujas } from '../../entities/Pujas';
import { Subastas } from '../../entities/Subastas';
import { NotificationsModule } from '../notifications/notifications.module';
import { AntiCheatService } from '../../common/anti-cheat/anti-cheat.service';

@Module({
  imports: [TypeOrmModule.forFeature([Pujas, Subastas]), NotificationsModule],
  controllers: [PujasController],
  providers: [PujasService, AntiCheatService],
})
export class PujasModule {}
