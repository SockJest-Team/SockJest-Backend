import {
  Injectable,
  CanActivate,
  ExecutionContext,
  Logger,
} from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import * as jwt from 'jsonwebtoken';
import JwksClient from 'jwks-rsa';
import { Socket } from 'socket.io';
import { UserRolesService } from '../user-roles.service';
import { SesionesService } from '../../modules/sesiones/sesiones.service';
import { limpiarIp } from '../utils/ip.util';

export interface JwtPayloadSupabase {
  sub: string;
  email: string;
}

export interface UsuarioSocket {
  userId: string;
  email: string;
  roles: string[];
}

export interface SocketAutenticable extends Socket {
  data: { user?: UsuarioSocket };
}

@Injectable()
export class WsJwtGuard implements CanActivate {
  private readonly logger = new Logger('WsJwtGuard');

  private readonly jwksClient: ReturnType<typeof JwksClient>;

  constructor(
    private readonly userRolesService: UserRolesService,
    private readonly sesionesService: SesionesService,
  ) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const jwksUri = `${supabaseUrl}/auth/v1/.well-known/jwks.json`;

    if (!supabaseUrl) {
      this.logger.error(
        '❌ [WS-AUTH] CONFIG: SUPABASE_URL está VACÍA al construir el guard — ' +
          'el .env no cargó antes de este módulo',
      );
    }

    this.jwksClient = JwksClient({
      jwksUri,
      cache: true,
      cacheMaxEntries: 5,
      cacheMaxAge: 10 * 60 * 1000,

      rateLimit: false,
      timeout: 10_000,
    });

    this.logger.log(`✅ [WS-AUTH] JWKS configurado: ${jwksUri}`);
  }

  private getKey(
    header: jwt.JwtHeader,
    callback: jwt.SigningKeyCallback,
  ): void {
    this.jwksClient.getSigningKey(header.kid, (err, key) => {
      if (err || !key) {
        return callback(
          err ?? new Error('No se pudo obtener la llave de firma'),
          undefined,
        );
      }
      callback(null, key.getPublicKey());
    });
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const wsClient = context.switchToWs().getClient<SocketAutenticable>();
    const token = wsClient.handshake.auth?.token as string | undefined;

    if (!token) {
      this.logger.error('❌ [WS-AUTH] FALLA: Token no proporcionado');
      throw new WsException('Token no proporcionado');
    }

    let tokenDecodificado: any = null;
    try {
      tokenDecodificado = jwt.decode(token);
    } catch (e) {
      this.logger.error(
        `❌ [WS-AUTH] FALLA: TOKEN_MALFORMADO — ${e instanceof Error ? e.message : String(e)}`,
      );
      throw new WsException('Token inválido o expirado');
    }

    const expMs = (tokenDecodificado?.exp ?? 0) * 1000;

    const payload = await new Promise<JwtPayloadSupabase>((resolve, reject) => {
      jwt.verify(
        token,
        this.getKey.bind(this),
        { algorithms: ['ES256'] },
        (err, decoded) => {
          if (err) {
            let causa = 'DESCONOCIDA';
            let detalle = '';

            if (err instanceof jwt.TokenExpiredError) {
              causa = 'TOKEN_EXPIRADO';
              detalle = `expiró hace ${Math.round((Date.now() - expMs) / 60000)} min`;
            } else if (err.message?.includes('JWKS URI')) {
              causa = 'JWKS_URI_INVALIDO';
              detalle = `SUPABASE_URL llegó vacía al construir el guard — ${err.message}`;
            } else if (err.message?.includes('Too many requests')) {
              causa = 'JWKS_RATE_LIMIT';
              detalle = 'demasiadas peticiones al JWKS (reconexiones en bucle)';
            } else if (err.message?.includes('kid')) {
              causa = 'JWKS_KID_NO_ENCONTRADO';
              detalle =
                'el kid del token no existe en los JWKS (¿otro proyecto?)';
            } else if (err.message?.includes('signature')) {
              causa = 'FIRMA_INVALIDA';
              detalle = 'firma no coincide — token corrupto o truncado';
            } else if (
              /ENOTFOUND|ETIMEDOUT|ECONNREFUSED|fetch failed|network/i.test(
                err.message ?? '',
              )
            ) {
              causa = 'JWKS_INALCANZABLE_RED';
              detalle = `sin conexión a Supabase: ${err.message}`;
            } else {
              causa = 'JWT_ERROR';
              detalle = err.message ?? String(err);
            }

            this.logger.error(`❌ [WS-AUTH] FALLA: ${causa} — ${detalle}`);
            this.logger.debug(
              `   → sub=${tokenDecodificado?.sub}, email=${tokenDecodificado?.email}, ` +
                `exp=${new Date(expMs).toISOString()}, len=${token.length}`,
            );

            return reject(new WsException('Token inválido o expirado'));
          }
          const verificado = decoded as JwtPayloadSupabase | undefined;
          if (!verificado?.sub || !verificado?.email) {
            this.logger.error('❌ [WS-AUTH] FALLA: PAYLOAD_INCOMPLETO');
            return reject(new WsException('Token inválido o expirado'));
          }

          this.logger.log(
            `✅ [WS-AUTH] Token VERIFICADO: ${verificado.sub} (${verificado.email})`,
          );
          resolve(verificado);
        },
      );
    });

    if (!payload.sub || !payload.email) {
      this.logger.error(
        `❌ [WS-AUTH] FALLA: PAYLOAD_INCOMPLETO — sub=${payload.sub}, email=${payload.email}`,
      );
      throw new WsException('Token inválido o expirado');
    }

    const ipActual = limpiarIp(
      (
        wsClient.handshake.headers['x-forwarded-for'] as string | undefined
      )?.split(',')[0] ??
        wsClient.handshake.address ??
        '',
    );
    const dispositivoActual =
      (wsClient.handshake.headers['user-agent'] as string | undefined) ??
      'Desconocido';

    let sesionValida: boolean;
    try {
      sesionValida = await this.sesionesService.validarSesion(
        payload.sub,
        ipActual,
        dispositivoActual,
      );
    } catch (e) {
      this.logger.error(
        `❌ [WS-AUTH] FALLA: BD_INALCANZABLE al validar sesión — ${e instanceof Error ? e.message : String(e)}`,
      );
      throw new WsException('Error interno validando sesión');
    }

    if (!sesionValida) {
      this.logger.error(
        `❌ [WS-AUTH] FALLA: SESION_NO_COINCIDE — ip=${ipActual}, ` +
          `dispositivo=${dispositivoActual.slice(0, 60)} para ${payload.sub}`,
      );
      throw new WsException(
        'La sesión no coincide con el dispositivo/IP registrado',
      );
    }

    let roles: string[];
    try {
      roles = await this.userRolesService.getRolesByUsuario(payload.sub);
    } catch (e) {
      this.logger.error(
        `❌ [WS-AUTH] FALLA: BD_INALCANZABLE al cargar roles — ${e instanceof Error ? e.message : String(e)}`,
      );
      throw new WsException('Error interno cargando roles');
    }

    this.logger.log(
      `✅ [WS-AUTH] Autenticación COMPLETA: ${payload.email} roles=[${roles.join(', ')}]`,
    );

    wsClient.data.user = {
      userId: payload.sub,
      email: payload.email,
      roles,
    };

    return true;
  }
}
