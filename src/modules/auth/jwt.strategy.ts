import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { passportJwtSecret } from 'jwks-rsa';
import { UserRolesService } from '../../common/user-roles.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private config: ConfigService,
    private readonly userRolesService: UserRolesService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      algorithms: ['ES256'],
      secretOrKeyProvider: passportJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: `${config.get('SUPABASE_URL')}/auth/v1/.well-known/jwks.json`,
      }),
    });
  }

  async validate(payload: any) {
    const userId: string = payload.sub;
    let roles: string[] = [];
    try {
      roles = await this.userRolesService.getRolesByUsuario(userId);
    } catch {
      roles = [];
    }
    return {
      userId,
      email: payload.email,
      roles,
    };
  }
}
