import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { PujasService } from './pujas.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CreatePujaDto } from './dto/create-puja.dto';
import { AuthenticatedRequest } from '../../common/interfaces/authenticated-request.interface';
import { AntiCheatGuard } from '../../common/guards/anti-cheat.guard';

@Controller('pujas')
export class PujasController {
  constructor(private readonly service: PujasService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  async registrar(
    @Body() dto: CreatePujaDto,
    @Req() req: AuthenticatedRequest & Request,
  ) {
    const ip =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
      req.socket.remoteAddress ||
      '';
    const dispositivo = req.headers['user-agent'] || 'Desconocido';
    return this.service.registrarPuja(dto, req.user.userId, ip, dispositivo);
  }

  @UseGuards(JwtAuthGuard, AntiCheatGuard)
  @Get('subasta/:idSubasta')
  historial(@Param('idSubasta') idSubasta: string) {
    return this.service.findAllBySubasta(idSubasta);
  }
}
