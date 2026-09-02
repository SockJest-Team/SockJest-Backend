import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notificaciones } from '../../entities/Notificaciones';
import { NotificationsGateway } from './notifications.gateway';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notificaciones)
    private readonly repo: Repository<Notificaciones>,
    private readonly gateway: NotificationsGateway,
  ) {}

  async enviarNotificacion(
    userId: string,
    mensaje: string,
    tipo: string,
    idSubasta?: string,
  ) {
    const nueva = this.repo.create({
      idUsuario: userId,
      tipo,
      mensaje,
      canal: 'WebSocket',
      idSubasta: idSubasta ? { idSubasta } : undefined,
    });

    const guardada = await this.repo.save(nueva);

    this.gateway.sendToUser(userId, 'newNotification', guardada);
    return guardada;
  }

  async findAllByUser(userId: string) {
    return this.repo.find({
      where: { idUsuario: userId },
      order: { fechaEnvio: 'DESC' },
    });
  }
}
