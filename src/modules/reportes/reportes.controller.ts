import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ReportesService } from './reportes.service';

@Controller('reportes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReportesController {
  constructor(private readonly reportesService: ReportesService) {}

  @Get('pagos')
  @Roles('Admin')
  pagos() {
    return this.reportesService.pagos();
  }

  @Get('usuarios')
  @Roles('Admin')
  usuarios() {
    return this.reportesService.usuarios();
  }
}
