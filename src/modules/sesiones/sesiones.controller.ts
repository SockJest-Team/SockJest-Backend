import {
  Controller,
  Get,
  Patch,
  Param,
  UseGuards,
  Req,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { SesionesService } from './sesiones.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthenticatedRequest } from '../../common/interfaces/authenticated-request.interface';

@Controller('sesiones')
@UseGuards(JwtAuthGuard)
export class SesionesController {
  constructor(private readonly sesionesService: SesionesService) {}

  @Get('usuario/:idUsuario')
  async findAllByUsuario(
    @Param('idUsuario') idUsuario: string,
    @Req() req: AuthenticatedRequest,
  ) {
    if (idUsuario !== req.user.userId && !req.user.roles?.includes('Admin')) {
      throw new ForbiddenException(
        'Solo puedes consultar tus propias sesiones.',
      );
    }
    return this.sesionesService.findAllByUsuario(idUsuario);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const sesion = await this.sesionesService.findOne(id);
    if (!sesion) {
      throw new NotFoundException('Sesión no encontrada.');
    }
    if (
      sesion.idUsuario !== req.user.userId &&
      !req.user.roles?.includes('Admin')
    ) {
      throw new ForbiddenException('No puedes consultar sesiones ajenas.');
    }
    return {
      idSesion: sesion.idSesion,
      idUsuario: sesion.idUsuario,
      ipAddress: sesion.ipAddress,
      dispositivo: sesion.dispositivo,
      activa: sesion.activa,
      fechaInicio: sesion.fechaInicio,
    };
  }

  @Patch(':id/cerrar')
  async cerrarSesion(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const sesion = await this.sesionesService.findOne(id);
    if (!sesion) {
      throw new NotFoundException('Sesión no encontrada.');
    }
    if (
      sesion.idUsuario !== req.user.userId &&
      !req.user.roles?.includes('Admin')
    ) {
      throw new ForbiddenException('No puedes cerrar sesiones ajenas.');
    }
    return this.sesionesService.cerrarSesion(id);
  }
}
