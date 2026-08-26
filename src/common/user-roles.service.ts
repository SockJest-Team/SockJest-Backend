import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { UsuarioRoles } from '../entities/UsuarioRoles';
import { Repository } from 'typeorm';

@Injectable()
export class UserRolesService {
    constructor(
        @InjectRepository(UsuarioRoles)
        private readonly repo: Repository<UsuarioRoles>,
    ){}

    async getRolesByUsuario(idUsuario: string): Promise<string[]>{
        const registros = await this.repo.find({
            where: { idUsuario},
            relations: ['idRol2'], //trae relación hacia roles
        });
        return registros.map((r) => r.idRol2.nombreRol);
    }
}
