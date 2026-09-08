import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { CreatePujaDto } from './dto/create-puja.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt.auth.guard';
import { AuthenticatedRequest } from '../../common/interfaces/authenticated-request.interface';
import { PujasService, SnapshotSubasta } from './pujas.service';

@Controller('pujas')
export class PujasController {
  constructor(private readonly pujasService: PujasService) {}

  @Get('snapshot/:subastaId')
  @UseGuards(OptionalJwtAuthGuard)
  getSnapshot(
    @Param('subastaId') subastaId: string,
    @Req() req: Request,
  ): Promise<SnapshotSubasta> {
    const requesterId = (req as { user?: { userId?: string } }).user?.userId;
    return this.pujasService.getSnapshot(subastaId, requesterId);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  registrar(@Body() dto: CreatePujaDto, @Req() req: AuthenticatedRequest) {
    const ip =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
      req.socket.remoteAddress ||
      '0.0.0.0';
    const dispositivo = (req.headers['user-agent'] as string) || 'Desconocido';

    return this.pujasService.registrarPuja(
      { subastaId: dto.idSubasta, monto: dto.monto },
      { userId: req.user.userId, email: req.user.email },
      { ip, dispositivo },
    );
  }
}
