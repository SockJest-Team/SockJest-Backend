import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Calificaciones } from '../../entities/Calificaciones';
import { Subastas } from '../../entities/Subastas';
import { CreateCalificacionDto } from './dto/create-calificacion.dto';

type ReputacionResult = {
  promedio: string;
  total: string;
};

@Injectable()
export class CalificacionesService {
  constructor(
    @InjectRepository(Calificaciones)
    private readonly repo: Repository<Calificaciones>,
    @InjectRepository(Subastas)
    private readonly subastasRepo: Repository<Subastas>,
  ) {}

  async crearCalificacion(dto: CreateCalificacionDto, idComprador: string) {
    const subasta = await this.subastasRepo.findOne({
      where: { idSubasta: dto.idSubasta },
      relations: ['idGanador', 'idSubastador'],
    });
    if (!subasta) throw new NotFoundException('Subasta no encontrada');

    if (subasta.estado !== 'Finalizada')
      throw new BadRequestException('La subasta aún no ha finalizado');

    if (subasta.idGanador?.idUsuario !== idComprador)
      throw new BadRequestException('Solo el ganador puede calificar');

    const existente = await this.repo.findOneBy({ idSubasta: dto.idSubasta });
    if (existente)
      throw new BadRequestException('Esta subasta ya fue calificada');

    const nueva = this.repo.create({
      puntuacion: dto.puntuacion,
      comentario: dto.comentario,
      idSubasta: dto.idSubasta,
      idSubastador: subasta.idSubastador?.idUsuario,
      idComprador: { idUsuario: idComprador },
      idSubasta2: { idSubasta: dto.idSubasta },
      idSubastador2: { idUsuario: subasta.idSubastador?.idUsuario },
    });

    return this.repo.save(nueva);
  }

  async getReputacionSubastador(idSubastador: string) {
    const data = await this.repo
      .createQueryBuilder('cal')
      .select('AVG(cal.puntuacion)', 'promedio')
      .addSelect('COUNT(cal.idCalificacion)', 'total')
      .where('cal.idSubastador = :id', { id: idSubastador })
      .getRawOne<ReputacionResult>();

    if (!data) {
      return {
        promedio: 0,
        totalCalificaciones: 0,
      };
    }

    return {
      promedio: parseFloat(data.promedio) || 0,
      totalCalificaciones: parseInt(data.total, 10) || 0,
    };
  }
}
