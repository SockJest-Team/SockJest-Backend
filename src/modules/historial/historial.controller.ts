import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { HistorialService } from './historial.service';

@Controller('historial')
@UseGuards(JwtAuthGuard, RolesGuard)
export class HistorialController {
  constructor(private readonly historialService: HistorialService) {}

  @Get('subastas')
  @Roles('Admin')
  todos(@Query('idSubasta') idSubasta?: string) {
    return this.historialService.todos(idSubasta);
  }
}
