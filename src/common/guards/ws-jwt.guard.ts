import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import * as jwt from 'jsonwebtoken';
import JwksClient from 'jwks-rsa';
import { UserRolesService } from '../user-roles.service';
import { SesionesService } from '../../modules/sesiones/sesiones.service';
import { Observable } from 'rxjs';

//crea un mensajero
const client = JwksClient({
    jwksUri: `${process.env.SUPABASE_URL}/auth/v1/.well-known/jwks.json`,
});

//Trae un codigo escrito en su cabecera, lo busca y lo entrega. De lo contrario avisa error
function getKey(header: jwt.JwtHeader, callback: jwt.SigningKeyCallback) {
  client.getSigningKey(header.kid, (err, key) => {
    if (err || !key) {
      return callback(err || new Error('No se pudo obtener la llave de firma'), undefined);
    }
    callback(null, key.getPublicKey());
  });
}

@Injectable()
export class WsJwtGuard implements CanActivate {
    constructor(
        private userRolesService: UserRolesService,
        private sesionesService: SesionesService,
    ){}

    //Metodo de seguridad permite pasar o no
    async canActivate(context: ExecutionContext): Promise<boolean> {
        const wsClient = context.switchToWs().getClient();
        const token = wsClient.handshake.auth?.token;

        if (!token) throw new WsException('Token no proporcionado');

        const decoded: any = await new Promise((resolve, reject) => {
            jwt.verify(token, getKey, { algorithms: ['ES256']}, (err, payload) => {
                if (err) return reject(new WsException('Token inválido o expirado'));
                resolve(payload);
            });
        });

        const ipActual = 
        (wsClient.handshake.headers['x-forwarded-for'] as string)?.split(',')[0] || 
        wsClient.handshake.address;
        const dispositivoActual = wsClient.handshake.headers['user-agent'] || 'Desconocido';

        const sesionValida= await this.sesionesService.validarSesion(
            decoded.sub,
            ipActual,
            dispositivoActual,
        );

        if(!sesionValida){
            throw new WsException('La sesión no coincide con el dispositivo/IP registrado');   
        }

        const roles = await this.userRolesService.getRolesByUsuario(decoded.sub);

        wsClient.data.user = {
            userId: decoded.sub,
            email: decoded.email,
            roles,
        };

        return true;
    }
}