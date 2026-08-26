import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { SupabaseProvider } from '../../config/supabase.provider';
import { Usuarios } from '../../entities/Usuarios';
import { Roles } from '../../entities/Roles';
import { UsuarioRoles } from '../../entities/UsuarioRoles';

@Module({
  imports: [TypeOrmModule.forFeature([Usuarios, Roles, UsuarioRoles])],
  controllers: [AuthController],
  providers: [AuthService, SupabaseProvider],
})
export class AuthModule {}