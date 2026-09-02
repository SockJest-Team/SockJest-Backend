import { Module } from '@nestjs/common';
import { SchedulerService } from './scheduler.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Subastas } from '../../entities/Subastas';
import { AuctionModule } from '../auction/auction.module';

@Module({
  imports: [TypeOrmModule.forFeature([Subastas]), AuctionModule],
  providers: [SchedulerService]
})
export class SchedulerModule {}
