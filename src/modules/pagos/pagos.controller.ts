import {
  Body,
  Controller,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { PagosService } from './pagos.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthenticatedRequest } from '../../common/interfaces/authenticated-request.interface';
import { CrearPagoDto } from './dto/crear-pago.dto';

@Controller('pagos')
export class PagosController {
  constructor(private readonly service: PagosService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  iniciar(@Body() dto: CrearPagoDto, @Req() req: AuthenticatedRequest) {
    return this.service.iniciarPago(dto, req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/confirmar')
  confirmar(@Param('id') id: string, @Body('referencia') referencia: string) {
    return this.service.confirmarPago(id, referencia);
  }
}
