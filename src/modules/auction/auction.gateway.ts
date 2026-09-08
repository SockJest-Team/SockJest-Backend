import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger, UseGuards } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import {
  SocketAutenticable,
  WsJwtGuard,
} from '../../common/guards/ws-jwt.guard';
import { ErrorCodes } from '../../common/constants/error-codes';
import { ApiException } from '../../common/utils/api-error';
import { PujasService, SnapshotSubasta } from '../pujas/pujas.service';
import { SalaStateService } from '../../common/services/sala-state.service';

export interface PayloadJoin {
  subastaId: string;
}

export interface PayloadPuja {
  subastaId: string;
  monto: number;
}

export interface EventoError {
  code: string;
  message: string;
}

export interface RespuestaAck {
  ok: boolean;
  code?: string;
  message?: string;
}

interface SocketConSalas extends Socket {
  data: {
    user?: { userId: string; email: string; roles: string[] };
    salasSubasta?: Set<string>;
    esDueñoPorSala?: Record<string, boolean>;
  };
}

const salaSubasta = (subastaId: string) => `subasta:${subastaId}`;
const salaUsuario = (userId: string) => `user:${userId}`;

@UseGuards(WsJwtGuard)
@WebSocketGateway({
  namespace: '/auctions',
  cors: { origin: process.env.CORS_ORIGIN ?? '*', credentials: true },
})
export class AuctionGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(AuctionGateway.name);

  @WebSocketServer()
  server: Server;

  constructor(
    private readonly pujasService: PujasService,
    private readonly salaState: SalaStateService,
  ) {}

  handleConnection(client: SocketAutenticable) {
    this.logger.log(`WS conectado: ${client.id}`);
  }

  handleDisconnect(client: SocketConSalas) {
    const user = client.data.user;
    if (!user) return;
    this.logger.log(`WS desconectado: ${user.email}`);

    const salas = client.data.salasSubasta;
    if (salas) {
      for (const subastaId of salas) {
        if (!client.data.esDueñoPorSala?.[subastaId]) {
          this.salaState.quitarComprador(subastaId, client.id);
        }
        this.difundirParticipantes(subastaId);
      }
    }
  }

  @SubscribeMessage('joinSubasta')
  async handleJoin(
    @ConnectedSocket() client: SocketConSalas,
    @MessageBody() body: PayloadJoin,
  ): Promise<RespuestaAck> {
    const user = client.data.user;
    if (!user) return { ok: false, message: 'No autenticado' };

    try {
      await client.join(salaUsuario(user.userId));

      const snapshot: SnapshotSubasta = await this.pujasService.getSnapshot(
        body.subastaId,
        user.userId,
      );

      if (!snapshot.esDueño && snapshot.limiteUsuariosConcurrentes !== null) {
        const compradores = this.salaState.contarCompradores(body.subastaId);
        if (compradores >= snapshot.limiteUsuariosConcurrentes) {
          client.emit('subasta:error', {
            code: ErrorCodes.SALA_LLENA,
            message: 'La sala está llena. Intenta ingresar más tarde.',
          } satisfies EventoError);
          return {
            ok: false,
            code: ErrorCodes.SALA_LLENA,
            message: 'Sala llena',
          };
        }
      }

      client.data.salasSubasta ??= new Set<string>();
      client.data.salasSubasta.add(body.subastaId);
      client.data.esDueñoPorSala ??= {};
      client.data.esDueñoPorSala[body.subastaId] = Boolean(snapshot.esDueño);

      if (!snapshot.esDueño) {
        this.salaState.agregarComprador(body.subastaId, client.id);
      }

      await client.join(salaSubasta(body.subastaId));

      client.emit('subasta:snapshot', snapshot);

      this.difundirParticipantes(body.subastaId);

      return { ok: true };
    } catch (e) {
      this.emitirError(client, e);
      return this.respuestaDeError(e);
    }
  }

  @SubscribeMessage('leaveSubasta')
  async handleLeave(
    @ConnectedSocket() client: SocketConSalas,
    @MessageBody() body: PayloadJoin,
  ) {
    await client.leave(salaSubasta(body.subastaId));
    client.data.salasSubasta?.delete(body.subastaId);
    this.salaState.quitarComprador(body.subastaId, client.id);
    this.difundirParticipantes(body.subastaId);
  }

  @SubscribeMessage('nuevaPuja')
  async handleNuevaPuja(
    @ConnectedSocket() client: SocketConSalas,
    @MessageBody() body: PayloadPuja,
  ): Promise<RespuestaAck> {
    const user = client.data.user;
    if (!user) return { ok: false, message: 'No autenticado' };

    if (!client.data.salasSubasta?.has(body.subastaId)) {
      const mensaje = 'Debes entrar a la sala antes de pujar.';
      client.emit('subasta:error', {
        code: ErrorCodes.NO_INSCRITO,
        message: mensaje,
      } satisfies EventoError);
      return { ok: false, code: ErrorCodes.NO_INSCRITO, message: mensaje };
    }

    const ip = this.extraerIp(client);
    const dispositivo = client.handshake.headers['user-agent'] ?? 'Desconocido';

    try {
      const resultado = await this.pujasService.registrarPuja(
        { subastaId: body.subastaId, monto: body.monto },
        { userId: user.userId, email: user.email },
        { ip, dispositivo },
      );

      const sala = salaSubasta(body.subastaId);

      this.server.to(sala).emit('puja:nueva', resultado.puja);

      if (resultado.superadoId) {
        this.server
          .to(salaUsuario(resultado.superadoId))
          .emit('puja:superado', {
            subastaId: body.subastaId,
            nuevoPrecio: resultado.puja.monto,
          });
      }

      if (resultado.fechaFinNueva) {
        this.server.to(sala).emit('subasta:tiempo', {
          subastaId: body.subastaId,
          fechaFin: resultado.fechaFinNueva.toISOString(),
          servidorAhora: Date.now(),
          extendida: true,
        });
      }

      return { ok: true };
    } catch (e) {
      this.emitirError(client, e);
      return this.respuestaDeError(e);
    }
  }

  notificarCierre(
    subastaId: string,
    resultado: { conGanador: boolean; montoFinal: string | null },
  ) {
    this.server.to(salaSubasta(subastaId)).emit('subasta:cerrada', {
      subastaId,
      montoFinal: resultado.montoFinal,
    });
  }

  notificarInicio(subastaId: string) {
    this.server
      .to(salaSubasta(subastaId))
      .emit('subasta:iniciada', { subastaId });
  }

  private extraerIp(client: Socket): string {
    const forwarded = client.handshake.headers['x-forwarded-for'];

    if (typeof forwarded === 'string') {
      const primera = forwarded.split(',')[0].trim();
      return primera || client.handshake.address || '';
    }

    if (Array.isArray(forwarded) && forwarded.length > 0) {
      return forwarded[0] || client.handshake.address || '';
    }

    return client.handshake.address || '';
  }

  private difundirParticipantes(subastaId: string) {
    this.server.to(salaSubasta(subastaId)).emit('sala:participantes', {
      subastaId,
      total: this.salaState.contarCompradores(subastaId),
    });
  }

  private respuestaDeError(e: unknown): RespuestaAck {
    if (e instanceof ApiException) {
      const body = e.getResponse() as { code: string; message: string };
      return { ok: false, code: body.code, message: body.message };
    }
    return {
      ok: false,
      code: ErrorCodes.ERROR_INESPERADO,
      message: 'Error inesperado. Intenta de nuevo.',
    };
  }

  private emitirError(client: Socket, e: unknown) {
    if (e instanceof ApiException) {
      const body = e.getResponse() as { code: string; message: string };
      client.emit('subasta:error', { code: body.code, message: body.message });
      return;
    }
    this.logger.error(
      `Error inesperado en WS: ${e instanceof Error ? e.stack : String(e)}`,
    );
    client.emit('subasta:error', {
      code: ErrorCodes.ERROR_INESPERADO,
      message: 'Error inesperado. Intenta de nuevo.',
    });
  }
}
