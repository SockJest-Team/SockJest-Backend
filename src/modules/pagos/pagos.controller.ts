import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { PagosService } from './pagos.service';
import { ProcesarPagoDto } from './dto/procesar-pago.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthenticatedRequest } from '../../common/interfaces/authenticated-request.interface';

@Controller('pagos')
export class PagosController {
  constructor(private readonly pagosService: PagosService) {}

  @UseGuards(JwtAuthGuard)
  @Get('mios')
  findMisPagos(@Req() req: AuthenticatedRequest) {
    return this.pagosService.findMisPagos(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findPago(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.pagosService.findPago(id, req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/procesar')
  procesarPago(
    @Param('id') id: string,
    @Body() dto: ProcesarPagoDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.pagosService.procesarPago(id, req.user.userId, dto);
  }
}
