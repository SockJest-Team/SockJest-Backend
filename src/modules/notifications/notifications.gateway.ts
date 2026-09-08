import { UseGuards } from '@nestjs/common';
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import {
  SocketAutenticable,
  WsJwtGuard,
} from '../../common/guards/ws-jwt.guard';

export interface EventoNotificacion {
  tipo:
    | 'RECHAZO'
    | 'APROBACION'
    | 'INICIO_SUBASTA'
    | 'VICTORIA'
    | 'RENOVACION'
    | 'PAGO_CONFIRMADO'
    | 'RESERVA'
    | 'ACCESO';
  titulo: string;
  mensaje: string;
  idSubasta?: string;
  timestamp: number;
}

@WebSocketGateway({
  namespace: '/notifications',
  cors: { origin: process.env.FRONTEND_URL ?? '*' },
})
@UseGuards(WsJwtGuard)
export class NotificationsGateway {
  @WebSocketServer()
  server: Server;

  notificarUsuario(
    userId: string,
    evento: Omit<EventoNotificacion, 'timestamp'>,
  ): void {
    try {
      this.server?.to(userId).emit('notificacion', {
        ...evento,
        timestamp: Date.now(),
      });
    } catch {
      /* usuario desconectado — ya está persistida en BD */
    }
  }

  @SubscribeMessage('joinRoom')
  handleJoin(@ConnectedSocket() client: SocketAutenticable) {
    const userId = client.data.user?.userId;
    if (userId) {
      client.join(userId);
    }
    return { event: 'joined' };
  }
}
