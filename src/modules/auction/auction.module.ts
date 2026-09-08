import { Module } from '@nestjs/common';
import { AuctionGateway } from './auction.gateway';
import { WsJwtGuard } from '../../common/guards/ws-jwt.guard';
import { PujasModule } from '../pujas/pujas.module';
import { SesionesModule } from '../sesiones/sesiones.module';
import { CommonModule } from '../../common/common.module';
import { BidsModule } from '../bids/bids.module';

@Module({
  imports: [PujasModule, SesionesModule, CommonModule],
  providers: [AuctionGateway, WsJwtGuard],
  exports: [AuctionGateway],
})
export class AuctionModule {}
