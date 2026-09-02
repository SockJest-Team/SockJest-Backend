import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/notifications',
})
export class NotificationsGateway {
  @WebSocketServer()
  server: Server;

  sendToUser(userId: string, event: string, data: any) {
    this.server.to(userId).emit(event, data);
  }

  @SubscribeMessage('joinRoom')
  handleJoin(@ConnectedSocket() client: Socket, @MessageBody() userId: string) {
    client.join(userId);
    return { event: 'joined', data: { userId } };
  }
}
