import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Sesiones } from '../../entities/Sesiones';

@Injectable()
export class SesionesService {
  constructor(
    @InjectRepository(Sesiones) private readonly repo: Repository<Sesiones>,
  ) {}

  findAllByUsuario(idUsuario: string) {
    return this.repo.find({ where: { idUsuario }, order: { fechaInicio: 'DESC' } });
  }

  findOne(idSesion: string) {
    return this.repo.findOneBy({ idSesion });
  }

  async cerrarSesion(idSesion: string) {
    return this.repo.update({ idSesion }, { activa: false });
  }

  async validarSesion(idUsuario: string, ip: string, dispositivo: string): Promise<boolean>{
    const sesion = await this.repo.findOne({
      where: {idUsuario, activa: true},
      order: { fechaInicio: 'DESC'},
    });

    if(!sesion) return false;

    return sesion.ipAddress === ip && sesion.dispositivo === dispositivo;
  }

}