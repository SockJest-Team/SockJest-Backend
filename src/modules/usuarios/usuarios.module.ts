import { Module } from '@nestjs/common';
import { UsuariosService } from './usuarios.service';
import { UsuariosController } from './usuarios.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Usuarios } from '../../entities/Usuarios';
import { UsuarioRoles } from '../../entities/UsuarioRoles';
import { Roles } from '../../entities/Roles';
import { Calificaciones } from '../../entities/Calificaciones';

@Module({
  imports:[TypeOrmModule.forFeature([Usuarios, Calificaciones, UsuarioRoles, Roles])],
  controllers: [UsuariosController],
  providers: [UsuariosService],
})
export class UsuariosModule {}
