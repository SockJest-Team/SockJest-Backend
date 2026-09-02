import { Module } from '@nestjs/common';
import { AuctionGateway } from './auction.gateway';
import { SesionesModule } from '../sesiones/sesiones.module';
import { CommonModule } from '../../common/common.module';
import { BidsModule } from '../bids/bids.module';

@Module({
  imports: [SesionesModule, CommonModule, BidsModule],
  providers: [AuctionGateway],
  exports: [AuctionGateway],
})
export class AuctionModule {}
