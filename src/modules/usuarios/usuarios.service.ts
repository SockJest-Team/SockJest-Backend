import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Usuarios } from '../../entities/Usuarios';
import { Repository } from 'typeorm';
import { Roles } from '../../entities/Roles';
import { UsuarioRoles } from '../../entities/UsuarioRoles';
import { ChangeRoleDto } from './dto/change-role.dto';

@Injectable()
export class UsuariosService {
  constructor(
    @InjectRepository(Usuarios)
    private readonly usuariosRepo: Repository<Usuarios>,
    @InjectRepository(UsuarioRoles)
    private readonly usuariosRolesRepo: Repository<UsuarioRoles>,
    @InjectRepository(Roles) private readonly rolesRepo: Repository<Roles>,
  ) {}

  findAll() {
    return this.usuariosRepo.find();
  }

  async findOne(idUsuario: string) {
    const usuario = await this.usuariosRepo.findOneBy({ idUsuario });
    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }
    return usuario;
  }

  async update(idUsuario: string, dto: UpdateUsuarioDto) {
    await this.findOne(idUsuario); //Valida la existencia de este usuario
    await this.usuariosRepo.update({ idUsuario }, dto);
    return this.findOne(idUsuario);
  }

  //cambio de rol
  async changeRole(idUsuario: string, dto: ChangeRoleDto) {
    await this.findOne(idUsuario);

    const rol = await this.rolesRepo.findOneBy({ nombreRol: dto.rol });
    if (!rol) {
      throw new NotFoundException('Rol no configurado en la base de datos');
    }

    const yaLoTiene = await this.usuariosRolesRepo.findOneBy({
      idUsuario,
      idRol: rol.idRol,
    });
    if (yaLoTiene) {
      throw new ConflictException('El usuario ya tiene ese rol asignado');
    }

    const nuevaAsignación = this.usuariosRolesRepo.create({
      idUsuario,
      idRol: rol.idRol,
    });
    return this.usuariosRolesRepo.save(nuevaAsignación);
  }

  async getRoles(idUsuario: string) {
    const registros = await this.usuariosRolesRepo.find({
      where: { idUsuario },
      relations: ['idRol2'],
    });
    return registros.map((r) => r.idRol2.nombreRol);
  }

  async remove(idUsuario: string) {
    await this.findOne(idUsuario);
    return this.usuariosRepo.update({ idUsuario }, { estado: 'Inactivo' });
  }
}
