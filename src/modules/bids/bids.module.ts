import { Module } from '@nestjs/common';
import { BidsService } from './bids.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Pujas } from '../../entities/Pujas';
import { Subastas } from '../../entities/Subastas';

@Module({
  imports: [TypeOrmModule.forFeature([Pujas, Subastas])],
  providers: [BidsService],
  exports: [BidsService],
})
export class BidsModule {}
