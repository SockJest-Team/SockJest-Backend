import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthenticatedRequest } from '../../common/interfaces/authenticated-request.interface';
import { CalificacionesService } from './calificaciones.service';
import { CreateCalificacionDto } from './dto/create-calificacion.dto';

@Controller('calificaciones')
export class CalificacionesController {
  constructor(private readonly service: CalificacionesService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  crear(@Body() dto: CreateCalificacionDto, @Req() req: AuthenticatedRequest) {
    return this.service.crear(dto, req.user.userId);
  }

  @Get('subastador/:idSubastador')
  reputacion(@Param('idSubastador') idSubastador: string) {
    return this.service.reputacion(idSubastador);
  }
}
