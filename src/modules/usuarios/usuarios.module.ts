import { Module } from '@nestjs/common';
import { UsuariosService } from './usuarios.service';
import { UsuariosController } from './usuarios.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Usuarios } from '../../entities/Usuarios';
import { UsuarioRoles } from '../../entities/UsuarioRoles';
import { Roles } from '../../entities/Roles';

@Module({
  imports:[TypeOrmModule.forFeature([Usuarios, UsuarioRoles, Roles])],
  controllers: [UsuariosController],
  providers: [UsuariosService],
})
export class UsuariosModule {}
