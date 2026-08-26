import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get('SUPABASE_JWT_SECRET') as string,
    });
  }

  async validate(payload: any) {
    // Esto es lo que llega en el token de Supabase
    return {
      userId: payload.sub,          // id del usuario en auth.users
      email: payload.email,
      role: payload.user_metadata?.role || payload.app_metadata?.role,
    };
  }
}