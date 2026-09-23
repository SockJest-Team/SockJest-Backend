import {
  Controller,
  Get,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
  ForbiddenException,
} from '@nestjs/common';
import { UsuariosService } from './usuarios.service';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuthenticatedRequest } from '../../common/interfaces/authenticated-request.interface';

@Controller('usuarios')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  @Get()
  @Roles('Admin')
  findAll() {
    return this.usuariosService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    if (id !== req.user.userId && !req.user.roles?.includes('Admin')) {
      throw new ForbiddenException('No puedes consultar otros usuarios.');
    }
    const u = await this.usuariosService.findOne(id);
    if (!req.user.roles?.includes('Admin')) {
      return {
        idUsuario: u.idUsuario,
        nombreCompleto: u.nombreCompleto,
        estado: u.estado,
        fechaRegistro: u.fechaRegistro,
      };
    }
    return u;
  }

  @Get(':id/roles')
  async getRoles(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    if (id !== req.user.userId && !req.user.roles?.includes('Admin')) {
      throw new ForbiddenException(
        'No puedes consultar roles de otros usuarios.',
      );
    }
    return this.usuariosService.getRoles(id);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateUsuarioDto,
    @Req() req: AuthenticatedRequest,
  ) {
    if (id !== req.user.userId && !req.user.roles?.includes('Admin')) {
      throw new ForbiddenException('No puedes modificar a otro usuario.');
    }
    if (dto.estado !== undefined && !req.user.roles?.includes('Admin')) {
      delete dto.estado;
    }
    return this.usuariosService.update(id, dto);
  }

  @Delete(':id')
  @Roles('Admin')
  remove(@Param('id') id: string) {
    return this.usuariosService.remove(id);
  }
}
