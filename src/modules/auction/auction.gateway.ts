import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards } from '@nestjs/common';
import { BidsService } from '../bids/bids.service';
import { WsJwtGuard } from '../../common/guards/ws-jwt.guard';

@WebSocketGateway({
  cors: { origin: '*' }, //Corregir
  namespace: '/auctions',
})
export class AuctionGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(private readonly bidsService: BidsService) { }

  handleConnection(client: Socket) {
    console.log(`Cliente conectado: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Cliente desconectado: ${client.id}`);
  }

  @SubscribeMessage('joinAuction')
  handleJoinAuction(
    @MessageBody() data: { auctionId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.join(`auction_${data.auctionId}`);
    return { event: 'joined', auctionId: data.auctionId };
  }

  @SubscribeMessage('leaveAuction')
  handleLeaveAuction(
    @MessageBody() data: { auctionId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.leave(`auction_${data.auctionId}`);
  }

  //Bids
  @UseGuards(WsJwtGuard)
  @SubscribeMessage('placeBid')
  async handlePlaceBid(
    @MessageBody() data: { auctionId: string; amount: number },
    @ConnectedSocket() client: Socket,
  ) {
    const user = client.data.user;
    const ip =
      (client.handshake.headers['x-forwarded-for'] as string)?.split(',')[0] ||
      client.handshake.address;
    const dispositivo = client.handshake.headers['user-agent'] || 'Desconocido';

    try {
      const result = await this.bidsService.placeBid(
        data.auctionId,
        user.userId,
        data.amount,
        ip,
        dispositivo,
      );

      if (result.previousBidder) {
        this.server.to(`user_${result.previousBidder}`).emit('outbid', {
          auctionId: data.auctionId,
          newAmount: data.amount,
        });
      }

      this.server.to(`auction_${data.auctionId}`).emit('bidUpdate', {
        userId: user.userId,
        amount: data.amount,
      });
    } catch(error) {
      const mensaje = error instanceof Error ? error.message : 'Error desconocido al procesar la puja';
      client.emit('bidError', { message: mensaje });
    }
}

}
