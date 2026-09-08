import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SubastaHistorialEstados } from '../../entities/SubastaHistorialEstados';

@Injectable()
export class HistorialService {
  constructor(
    @InjectRepository(SubastaHistorialEstados)
    private readonly repo: Repository<SubastaHistorialEstados>,
  ) {}

  async todos(idSubasta?: string) {
    const qb = this.repo
      .createQueryBuilder('h')
      .leftJoinAndSelect('h.idSubasta', 'subasta')
      .leftJoinAndSelect('h.idUsuarioResponsable', 'responsable')
      .orderBy('h.fecha', 'DESC')
      .take(200);

    if (idSubasta) {
      qb.andWhere('subasta.idSubasta = :id', { id: idSubasta });
    }
    return qb.getMany();
  }
}
