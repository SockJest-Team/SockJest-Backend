import { Controller, Get, Patch, Param } from '@nestjs/common';
import { SesionesService } from './sesiones.service';

@Controller('sesiones')
export class SesionesController {
  constructor(private readonly sesionesService: SesionesService) {}

  @Get('usuario/:idUsuario')
  findAllByUsuario(@Param('idUsuario') idUsuario: string) {
    return this.sesionesService.findAllByUsuario(idUsuario);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.sesionesService.findOne(id);
  }

  @Patch(':id/cerrar')
  cerrarSesion(@Param('id') id: string) {
    return this.sesionesService.cerrarSesion(id);
  }
}