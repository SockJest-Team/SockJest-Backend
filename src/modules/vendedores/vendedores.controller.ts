import { Controller, Get, Param, Query } from '@nestjs/common';
import { VendedoresService } from './vendedores.service';

@Controller('vendedores')
export class VendedoresController {
  constructor(private readonly vendedoresService: VendedoresService) {}

  @Get()
  listar(@Query('buscar') buscar?: string) {
    return this.vendedoresService.listar(buscar);
  }

  @Get(':id')
  perfil(@Param('id') id: string) {
    return this.vendedoresService.perfil(id);
  }
}
