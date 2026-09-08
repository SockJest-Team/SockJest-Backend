import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { Usuarios } from '../../entities/Usuarios';
import { Roles } from '../../entities/Roles';
import { UsuarioRoles } from '../../entities/UsuarioRoles';
import { CommonModule } from '../../common/common.module';
import { Sesiones } from '../../entities/Sesiones';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './jwt.strategy';

@Module({
  imports: [
    TypeOrmModule.forFeature([Usuarios, Roles, UsuarioRoles, Sesiones]),
    CommonModule,
    PassportModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
})
export class AuthModule {}
