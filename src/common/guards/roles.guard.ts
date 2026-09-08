import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRolesService } from '../user-roles.service';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { apiError } from '../utils/api-error';
import { ErrorCodes } from '../constants/error-codes';
import { HttpStatus } from '@nestjs/common';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private userRolesService: UserRolesService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.get<string[]>(
      ROLES_KEY,
      context.getHandler(),
    );
    if (!requiredRoles) return true; // ruta sin restricción de rol

    const request = context.switchToHttp().getRequest();
    const user = request.user; // viene del JwtAuthGuard (userId, email)

    const rolesDelUsuario = await this.userRolesService.getRolesByUsuario(
      user.userId,
    );

    const tienePermiso = requiredRoles.some((rol) =>
      rolesDelUsuario.includes(rol),
    );
    if (!tienePermiso) {
      if (!tienePermiso) {
        throw apiError(
          HttpStatus.FORBIDDEN,
          ErrorCodes.ROL_REQUERIDO,
          'Tu cuenta no tiene permiso para realizar esta acción.',
        );
      }
    }
    return true;
  }
}
