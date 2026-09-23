import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { VendedoresService } from './vendedores.service';
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt.auth.guard';

@Controller('vendedores')
export class VendedoresController {
  constructor(private readonly vendedoresService: VendedoresService) {}

  @UseGuards(OptionalJwtAuthGuard)
  @Get()
  listar(
    @Query('buscar') buscar?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '12',
  ) {
    return this.vendedoresService.listar(buscar, Number(page), Number(limit));
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get(':id')
  perfil(@Param('id') id: string) {
    return this.vendedoresService.perfil(id);
  }
}
