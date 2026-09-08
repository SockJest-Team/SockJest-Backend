import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notificaciones } from '../../entities/Notificaciones';
import { NotificationsGateway } from './notifications.gateway';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { WsJwtGuard } from '../../common/guards/ws-jwt.guard';
import { CommonModule } from '../../common/common.module';
import { SesionesModule } from '../sesiones/sesiones.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Notificaciones]),
    CommonModule,
    SesionesModule,
  ],
  controllers: [NotificationsController],
  providers: [NotificationsGateway, NotificationsService, WsJwtGuard],
  exports: [NotificationsGateway],
})
export class NotificationsModule {}
