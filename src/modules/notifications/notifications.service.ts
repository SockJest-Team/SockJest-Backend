import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notificaciones } from '../../entities/Notificaciones';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notificaciones)
    private readonly repo: Repository<Notificaciones>,
  ) {}

  async findAllByUser(idUsuario: string) {
    return this.repo.find({
      where: { idUsuario },
      relations: ['idSubasta'],
      order: { fechaEnvio: 'DESC' },
    });
  }
}
