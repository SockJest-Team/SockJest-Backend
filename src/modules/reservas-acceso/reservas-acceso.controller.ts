import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ReservasAccesoService } from './reservas-acceso.service';
import { CreateReservasDto } from './dto/create-reservas.dto';
import { UpdateReservasDto } from './dto/update-reservas.dto';

@Controller('reservas-acceso')
export class ReservasAccesoController {
  constructor(private readonly service: ReservasAccesoService) {}

  @Post()
  create(@Body() dto: CreateReservasDto) {
    return this.service.create(dto);
  }

  @Get('subasta/:idSubasta')
  findAllBySubasta(@Param('idSubasta') idSubasta: string) {
    return this.service.findAllBySubasta(idSubasta);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id/responder')
  update(@Param('id') id: string, @Body() dto:UpdateReservasDto) {
    return this.service.responder(id, dto);
  }

}
