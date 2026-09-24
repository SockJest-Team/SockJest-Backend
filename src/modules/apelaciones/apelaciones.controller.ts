import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApelacionesService } from './apelaciones.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuthenticatedRequest } from '../../common/interfaces/authenticated-request.interface';

@Controller('apelaciones')
export class ApelacionesController {
  constructor(private readonly service: ApelacionesService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  crear(@Body() body: { motivo: string }, @Req() req: AuthenticatedRequest) {
    return this.service.crear(req.user.userId, body.motivo);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin')
  @Get()
  findAll() {
    return this.service.findAll();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin')
  @Patch(':id/resolver')
  resolver(
    @Param('id') id: string,
    @Body() body: { estado: 'Aprobada' | 'Rechazada' },
  ) {
    return this.service.resolver(id, body.estado);
  }
}
