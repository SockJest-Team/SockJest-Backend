import { Injectable, Inject, ConflictException, InternalServerErrorException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SupabaseClient } from '@supabase/supabase-js';
import { RegisterDto } from './dto/register.dto';
import { Usuarios } from '../../entities/Usuarios';
import { Roles } from '../../entities/Roles';
import { UsuarioRoles } from '../../entities/UsuarioRoles';
import { Sesiones } from '../../entities/Sesiones';
import { LoginDto } from './dto/login.dto';
import { Request } from 'express';

@Injectable()
export class AuthService {
  constructor(
    @Inject('SUPABASE_CLIENT') private readonly supabase: SupabaseClient,
    @InjectRepository(Usuarios) private readonly usuariosRepo: Repository<Usuarios>,
    @InjectRepository(Roles) private readonly rolesRepo: Repository<Roles>,
    @InjectRepository(UsuarioRoles) private readonly usuarioRolesRepo: Repository<UsuarioRoles>,
    @InjectRepository(Sesiones) private readonly sesionesRepo: Repository<Sesiones>,
  ) {}

  async register(dto: RegisterDto) {
    // Verificar que el correo no exista ya
    const existe = await this.usuariosRepo.findOneBy({ correo: dto.correo });
    if (existe) {
      throw new ConflictException('El correo ya está registrado');
    }

    // Crear el usuario en Supabase Auth
    const { data: authData, error } = await this.supabase.auth.admin.createUser({
      email: dto.correo,
      password: dto.contraseña,
      email_confirm: true,
    });

    if (error) {
      throw new InternalServerErrorException(error.message);
    }

    const authUserId = authData.user.id;

    try {
      // Insertar en tu tabla usuarios
      const nuevoUsuario = this.usuariosRepo.create({
        idUsuario: authUserId,
        nombreCompleto: dto.nombre_completo,
        correo: dto.correo,
        telefono: dto.telefono,
        estado: 'Activo',
      });
      await this.usuariosRepo.save(nuevoUsuario);

      // Buscar el id_rol correspondiente al nombre de rol elegido
      const rol = await this.rolesRepo.findOneBy({ nombreRol: dto.rol });
      if (!rol) {
        throw new InternalServerErrorException('Rol no configurado en la base de datos');
      }

      // Asignar el rol al usuario
      const asignacion = this.usuarioRolesRepo.create({
        idUsuario: authUserId,
        idRol: rol.idRol,
      });
      await this.usuarioRolesRepo.save(asignacion);

      return {
        message: 'Usuario registrado correctamente',
        userId: authUserId,
      };
    } catch (dbError) {
      await this.supabase.auth.admin.deleteUser(authUserId);
      throw new InternalServerErrorException('Error al completar el registro');
    }
  }

  async login(dto: LoginDto, req: Request){
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email: dto.correo,
      password: dto.contraseña,
    });

    if (error) {
      throw new UnauthorizedException('Correo o contraseña incorrectos');
    }

    const idUsuario = data.user.id;
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.socket.remoteAddress;
    const dispositivo = req.headers['user-agent'] || 'Desconocido';

    const nuevaSesion = this.sesionesRepo.create({
      idUsuario,
      ipAddress: ip,
      dispositivo,
      activa: true,
    })
    await this.sesionesRepo.save(nuevaSesion);

    await this.usuariosRepo.update({ idUsuario }, {ultimaIp: ip, ultimoDispositivo: dispositivo});
    
    return{
      access_token: data.session.access_token,
      userId: idUsuario, 
    }
  }

}