import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
  Req,
  ForbiddenException,
} from '@nestjs/common';
import { ReservasAccesoService } from './reservas-acceso.service';
import { CreateReservasDto } from './dto/create-reservas.dto';
import { UpdateReservasDto } from './dto/update-reservas.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthenticatedRequest } from '../../common/interfaces/authenticated-request.interface';

@Controller('reservas-acceso')
@UseGuards(JwtAuthGuard)
export class ReservasAccesoController {
  constructor(private readonly service: ReservasAccesoService) {}

  @Post()
  create(@Body() dto: CreateReservasDto, @Req() req: AuthenticatedRequest) {
    if (dto.idComprador && dto.idComprador !== req.user.userId) {
      throw new ForbiddenException(
        'No puedes crear reservas a nombre de otro usuario.',
      );
    }
    dto.idComprador = req.user.userId;
    return this.service.create(dto);
  }

  @Get('subasta/:idSubasta')
  async findAllBySubasta(
    @Param('idSubasta') idSubasta: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.service.findAllBySubastaForUser(idSubasta, req.user.userId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.service.findOneForUser(id, req.user.userId);
  }

  @Patch(':id/responder')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateReservasDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.service.responderForUser(id, dto, req.user.userId);
  }
}
