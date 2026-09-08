import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SchedulerService } from './scheduler.service';
import { AuctionModule } from '../auction/auction.module';
import { EmailModule } from '../email/email.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { Subastas } from '../../entities/Subastas';
import { Pujas } from '../../entities/Pujas';
import { Pagos } from '../../entities/Pagos';
import { Usuarios } from '../../entities/Usuarios';

@Module({
  imports: [
    TypeOrmModule.forFeature([Subastas, Pujas, Pagos, Usuarios]),
    EmailModule,
    AuctionModule,
    NotificationsModule,
  ],
  providers: [SchedulerService],
})
export class SchedulerModule {}
