import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { SubastasService } from './subastas.service';
import { CreateSubastaDto } from './dto/create-subasta.dto';
import { UpdateSubastaDto } from './dto/update-subasta.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuthenticatedRequest } from '../../common/interfaces/authenticated-request.interface';

@Controller('subastas')
export class SubastasController {
  constructor(private readonly subastasService: SubastasService) {}

  // Regla: solo Subastador y Usuario pueden crear
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Subastador', 'Usuario')
  @Post()
  create(@Body() dto: CreateSubastaDto, @Req() req: AuthenticatedRequest) {
    return this.subastasService.create(dto, req.user.userId);
  }

  @Get()
  findAll(@Query() query: FiltroSubastasDto) {
    return this.subastasService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.subastasService.findOne(id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('mias/listado')
  findMine(@Req() req: AuthenticatedRequest) {
    return this.subastasService.findAllBySubastador(req.user.userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Subastador', 'Usuario')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateSubastaDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.subastasService.update(id, dto, req.user.userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Subastador', 'Usuario')
  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.subastasService.remove(id, req.user.userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Subastador', 'Usuario')
  @Get('estadisticas')
  getEstadisticas(@Req() req: AuthenticatedRequest) {
    return this.subastasService.calcularEstadisticas(req.user.userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin')
  @Patch(':id/aprobar')
  aprobarSubasta(@Param('id') id: string) {
    return this.subastasService.cambiarEstado(id, 'Aprobada');
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin')
  @Patch(':id/rechazar')
  rechazarSubasta(@Param('id') id: string, @Body('motivo') motivo: string) {
    return this.subastasService.rechazarSubasta(id, motivo);
  }
}
