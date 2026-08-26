import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { UsuariosService } from './usuarios.service';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';


@Controller('usuarios')
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService){ }
  
  @UseGuards(JwtAuthGuard)
  @Get()
  findAll() {
    return this.usuariosService.findAll();
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usuariosService.findOne(id);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/roles')
  getRoles(@Param('id') id: string) {
    return this.usuariosService.getRoles(id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateUsuarioDto) {
    return this.usuariosService.update(id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.usuariosService.remove(id);
  }
}
