import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Apelaciones } from '../../entities/Apelaciones';
import { Usuarios } from '../../entities/Usuarios';

@Injectable()
export class ApelacionesService {
  constructor(
    @InjectRepository(Apelaciones)
    private readonly apelacionesRepo: Repository<Apelaciones>,
    @InjectRepository(Usuarios)
    private readonly usuariosRepo: Repository<Usuarios>,
  ) {}

  async crear(idUsuario: string, motivo: string) {
    const apelacion = this.apelacionesRepo.create({ idUsuario, motivo });
    return this.apelacionesRepo.save(apelacion);
  }

  async findAll() {
    return this.apelacionesRepo.find({
      where: { estado: 'Pendiente' },
      relations: ['idUsuario2'],
      order: { fechaCreacion: 'DESC' },
    });
  }

  async resolver(idApelacion: string, estado: 'Aprobada' | 'Rechazada') {
    const apelacion = await this.apelacionesRepo.findOneBy({ idApelacion });
    if (!apelacion) throw new NotFoundException('Apelación no encontrada');

    apelacion.estado = estado;
    await this.apelacionesRepo.save(apelacion);

    if (estado === 'Aprobada') {
      await this.usuariosRepo.update(apelacion.idUsuario, { estado: 'Activo' });
    }

    return { ok: true };
  }
}
