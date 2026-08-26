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
}