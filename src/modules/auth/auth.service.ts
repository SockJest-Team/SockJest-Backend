import {
  Injectable,
  Inject,
  ConflictException,
  InternalServerErrorException,
  UnauthorizedException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SupabaseClient } from '@supabase/supabase-js';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { Request } from 'express';
import { Usuarios } from '../../entities/Usuarios';
import { Roles } from '../../entities/Roles';
import { UsuarioRoles } from '../../entities/UsuarioRoles';
import { Sesiones } from '../../entities/Sesiones';
import { UserRolesService } from '../../common/user-roles.service';
import { apiError } from '../../common/utils/api-error';
import { ErrorCodes } from '../../common/constants/error-codes';
import { limpiarIp } from '../../common/utils/ip.util';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @Inject('SUPABASE_CLIENT') private readonly supabase: SupabaseClient,
    @InjectRepository(Usuarios)
    private readonly usuariosRepo: Repository<Usuarios>,
    @InjectRepository(Roles) private readonly rolesRepo: Repository<Roles>,
    @InjectRepository(UsuarioRoles)
    private readonly usuarioRolesRepo: Repository<UsuarioRoles>,
    @InjectRepository(Sesiones)
    private readonly sesionesRepo: Repository<Sesiones>,
    private readonly userRolesService: UserRolesService,
  ) {}

  async register(dto: RegisterDto) {
    const existe = await this.usuariosRepo.findOneBy({ correo: dto.correo });
    if (existe) {
      throw apiError(
        HttpStatus.CONFLICT,
        ErrorCodes.CORREO_REGISTRADO,
        'Este correo ya tiene una cuenta.',
      );
    }

    const { data: authData, error } = await this.supabase.auth.admin.createUser(
      {
        email: dto.correo,
        password: dto.contraseña,
        email_confirm: true,
      },
    );

    if (error || !authData.user) {
      this.logger.error('Supabase createUser falló:', error?.message);
      throw apiError(
        HttpStatus.INTERNAL_SERVER_ERROR,
        ErrorCodes.ERROR_REGISTRO,
        'No pudimos crear tu cuenta. Intenta de nuevo.',
      );
    }

    const authUserId = authData.user.id;

    try {
      const nuevoUsuario = this.usuariosRepo.create({
        idUsuario: authUserId,
        nombreCompleto: dto.nombre_completo,
        correo: dto.correo,
        telefono: dto.telefono,
        estado: 'Activo',
      });
      await this.usuariosRepo.save(nuevoUsuario);

      const rol = await this.rolesRepo.findOneBy({ nombreRol: dto.rol });
      if (!rol) {
        throw apiError(
          HttpStatus.INTERNAL_SERVER_ERROR,
          ErrorCodes.ERROR_REGISTRO,
          'Rol no configurado en la base de datos.',
        );
      }

      await this.usuarioRolesRepo.save(
        this.usuarioRolesRepo.create({
          idUsuario: authUserId,
          idRol: rol.idRol,
        }),
      );

      return {
        message: 'Usuario registrado correctamente',
        userId: authUserId,
      };
    } catch (dbError) {
      if (dbError instanceof Error && 'statusCode' in dbError) throw dbError;
      this.logger.error('Error en BD durante registro:', dbError);
      await this.supabase.auth.admin.deleteUser(authUserId);
      throw apiError(
        HttpStatus.INTERNAL_SERVER_ERROR,
        ErrorCodes.ERROR_REGISTRO,
        'No pudimos completar el registro. Intenta de nuevo.',
      );
    }
  }

  async login(dto: LoginDto, req: Request) {
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email: dto.correo,
      password: dto.contraseña,
    });

    if (error || !data.session) {
      throw apiError(
        HttpStatus.UNAUTHORIZED,
        ErrorCodes.CREDENCIALES_INVALIDAS,
        'Correo o contraseña incorrectos. Verifica e intenta de nuevo.',
      );
    }

    const idUsuario = data.user.id;
    const ip = limpiarIp(
      (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
        req.socket.remoteAddress,
    );
    const dispositivo = req.headers['user-agent'] || 'Desconocido';

    const nuevaSesion = this.sesionesRepo.create({
      idUsuario,
      ipAddress: ip,
      dispositivo,
      activa: true,
    });
    await this.sesionesRepo.save(nuevaSesion);

    await this.usuariosRepo.update(
      { idUsuario },
      { ultimaIp: ip, ultimoDispositivo: dispositivo },
    );

    return {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      userId: idUsuario,
    };
  }

  async refreshSession(refreshToken: string) {
    const { data, error } = await this.supabase.auth.refreshSession({
      refresh_token: refreshToken,
    });

    if (error || !data.session) {
      throw apiError(
        HttpStatus.UNAUTHORIZED,
        ErrorCodes.CREDENCIALES_INVALIDAS,
        'Tu sesión expiró. Inicia sesión nuevamente.',
      );
    }

    if (!data.user) {
      throw apiError(
        HttpStatus.UNAUTHORIZED,
        ErrorCodes.CREDENCIALES_INVALIDAS,
        'No se pudo renovar la sesión. Inicia sesión nuevamente.',
      );
    }

    return {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      userId: data.user.id,
    };
  }

  async quienSoy(userId: string) {
    const usuario = await this.usuariosRepo.findOneBy({ idUsuario: userId });
    if (!usuario) {
      throw apiError(
        HttpStatus.NOT_FOUND,
        ErrorCodes.CREDENCIALES_INVALIDAS,
        'Tu cuenta ya no está disponible. Inicia sesión nuevamente.',
      );
    }

    const roles = await this.userRolesService.getRolesByUsuario(userId);

    return {
      user: {
        id: usuario.idUsuario,
        nombre: usuario.nombreCompleto,
        email: usuario.correo,
        roles,
      },
    };
  }
}
