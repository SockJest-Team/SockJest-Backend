// bandeja.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notificaciones } from '../../entities/Notificaciones';

@Injectable()
export class BandejaService {
  constructor(
    @InjectRepository(Notificaciones)
    private readonly repo: Repository<Notificaciones>,
  ) {}

  async mias(userId: string) {
    const [items, noLeidas] = await Promise.all([
      this.repo.find({
        where: { idUsuario: userId },
        relations: ['idSubasta'],
        order: { fechaEnvio: 'DESC' },
        take: 30,
      }),
      this.repo.count({ where: { idUsuario: userId, leido: false } }),
    ]);

    return {
      noLeidas,
      items: items.map((n) => ({
        idNotificacion: n.idNotificacion,
        tipo: n.tipo,
        mensaje: n.mensaje,
        leido: n.leido,
        fechaEnvio: n.fechaEnvio,
        idSubasta: n.idSubasta?.idSubasta ?? null,
      })),
    };
  }

  async leer(idNotificacion: string, userId: string) {
    await this.repo.update(
      { idNotificacion, idUsuario: userId },
      { leido: true },
    );
    return { leida: true };
  }

  async leerTodas(userId: string) {
    await this.repo.update(
      { idUsuario: userId, leido: false },
      { leido: true },
    );
    return { leidas: true };
  }
}
