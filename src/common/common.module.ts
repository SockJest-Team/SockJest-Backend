import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserRolesService } from './user-roles.service';
import { UsuarioRoles } from '../entities/UsuarioRoles';

@Module({
  imports: [TypeOrmModule.forFeature([UsuarioRoles])],
  providers: [UserRolesService],
  exports: [UserRolesService],
})
export class CommonModule {}