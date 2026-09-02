import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { CalificacionesService } from './calificaciones.service';
import { CreateCalificacionDto } from './dto/create-calificacion.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthenticatedRequest } from '../../common/interfaces/authenticated-request.interface';

@Controller('calificaciones')
export class CalificacionesController {
  constructor(private readonly service: CalificacionesService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  crear(@Body() dto: CreateCalificacionDto, @Req() req: AuthenticatedRequest) {
    return this.service.crearCalificacion(dto, req.user.userId);
  }

  @Get('subastador/:idSubastador')
  reputacion(@Param('idSubastador') idSubastador: string) {
    return this.service.getReputacionSubastador(idSubastador);
  }
}
