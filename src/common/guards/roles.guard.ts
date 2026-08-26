import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRolesService } from '../user-roles.service';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private userRolesService: UserRolesService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.get<string[]>(ROLES_KEY, context.getHandler());
    if (!requiredRoles) return true; // ruta sin restricción de rol

    const request = context.switchToHttp().getRequest();
    const user = request.user; // viene del JwtAuthGuard (userId, email)

    const rolesDelUsuario = await this.userRolesService.getRolesByUsuario(user.userId);

    const tienePermiso = requiredRoles.some((rol) => rolesDelUsuario.includes(rol));
    if (!tienePermiso) {
      throw new ForbiddenException('No tienes el rol requerido para esta acción');
    }
    return true;
  }
}