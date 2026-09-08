import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Calificaciones } from '../../entities/Calificaciones';
import { Subastas } from '../../entities/Subastas';
import { Usuarios } from '../../entities/Usuarios';
import { apiError } from '../../common/utils/api-error';
import { ErrorCodes } from '../../common/constants/error-codes';
import { CreateCalificacionDto } from './dto/create-calificacion.dto';

@Injectable()
export class CalificacionesService {
  constructor(
    @InjectRepository(Calificaciones)
    private readonly repo: Repository<Calificaciones>,
    @InjectRepository(Subastas)
    private readonly subastasRepo: Repository<Subastas>,
  ) {}

  async crear(dto: CreateCalificacionDto, userId: string) {
    const subasta = await this.subastasRepo.findOne({
      where: { idSubasta: dto.idSubasta },
      relations: ['idGanador', 'idSubastador'],
    });
    if (!subasta) {
      throw apiError(
        HttpStatus.NOT_FOUND,
        ErrorCodes.SUBASTA_NO_ENCONTRADA,
        'La subasta no existe.',
      );
    }
    if (subasta.estado !== 'Finalizada') {
      throw apiError(
        HttpStatus.CONFLICT,
        ErrorCodes.ESTADO_INVALIDO,
        'Solo puedes calificar cuando la subasta haya finalizado.',
      );
    }
    if (subasta.idGanador?.idUsuario !== userId) {
      throw apiError(
        HttpStatus.FORBIDDEN,
        ErrorCodes.NO_GANADOR,
        'Solo el ganador de la subasta puede calificar al subastador.',
      );
    }

    const yaCalifico = await this.repo.findOne({
      where: { idSubasta: dto.idSubasta },
    });
    if (yaCalifico) {
      throw apiError(
        HttpStatus.CONFLICT,
        ErrorCodes.YA_CALIFICADO,
        'Ya calificaste esta subasta.',
      );
    }

    const calificacion = await this.repo.save(
      this.repo.create({
        idSubasta: dto.idSubasta,
        idSubastador: subasta.idSubastador.idUsuario,
        puntuacion: dto.puntuacion,
        comentario: dto.comentario?.trim() || null,
        idComprador: { idUsuario: userId } as Usuarios,
      }),
    );
    return {
      idCalificacion: calificacion.idCalificacion,
      mensaje: '¡Gracias por tu calificación!',
    };
  }

  async reputacion(idSubastador: string) {
    const rows = await this.repo.find({ where: { idSubastador } });
    const total = rows.length;
    const promedio =
      total === 0 ? 0 : rows.reduce((s, r) => s + r.puntuacion, 0) / total;
    return { promedio: Math.round(promedio * 10) / 10, total };
  }
}
