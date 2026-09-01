import { Module } from '@nestjs/common';
import { AuctionGateway } from './auction.gateway';
import { SesionesModule } from '../sesiones/sesiones.module';
import { CommonModule } from '../../common/common.module';

@Module({
  imports: [SesionesModule, CommonModule],
  providers: [AuctionGateway]
})
export class AuctionModule {}
