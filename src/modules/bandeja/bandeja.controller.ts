import { Controller, Get, Param, Patch, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthenticatedRequest } from '../../common/interfaces/authenticated-request.interface';
import { BandejaService } from './bandeja.service';

@Controller('bandeja')
@UseGuards(JwtAuthGuard)
export class BandejaController {
  constructor(private readonly service: BandejaService) {}

  @Get()
  mias(@Req() req: AuthenticatedRequest) {
    return this.service.mias(req.user.userId);
  }

  @Patch('leer/:idNotificacion')
  leer(
    @Param('idNotificacion') idNotificacion: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.service.leer(idNotificacion, req.user.userId);
  }

  @Patch('leer-todas')
  leerTodas(@Req() req: AuthenticatedRequest) {
    return this.service.leerTodas(req.user.userId);
  }
}
