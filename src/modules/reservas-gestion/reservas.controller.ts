import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthenticatedRequest } from '../../common/interfaces/authenticated-request.interface';
import { ResponderReservaDto } from './dto/responder-reserva.dto';
import { InvitarDto } from './dto/invitar.dto';
import { ReservasService } from './reservas.service';

@Controller('mis-reservas')
@UseGuards(JwtAuthGuard)
export class ReservasController {
  constructor(private readonly reservasService: ReservasService) {}

  @Get()
  misSolicitudes(@Req() req: AuthenticatedRequest) {
    return this.reservasService.misSolicitudes(req.user.userId);
  }

  @Get('estado/:idSubasta')
  miEstado(
    @Param('idSubasta') idSubasta: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.reservasService.miEstado(idSubasta, req.user.userId);
  }

  @Post('solicitar/:idSubasta')
  solicitar(
    @Param('idSubasta') idSubasta: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.reservasService.solicitar(idSubasta, req.user.userId);
  }

  @Post('invitar')
  invitar(@Body() dto: InvitarDto, @Req() req: AuthenticatedRequest) {
    return this.reservasService.invitar(
      dto.idSubasta,
      dto.correo,
      req.user.userId,
    );
  }

  @Patch(':idReserva/responder')
  responder(
    @Param('idReserva') idReserva: string,
    @Body() dto: ResponderReservaDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.reservasService.responder(
      idReserva,
      req.user.userId,
      dto.aprobar,
    );
  }
}
