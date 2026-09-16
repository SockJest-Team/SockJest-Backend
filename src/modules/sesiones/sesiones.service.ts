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
    return this.repo.find({
      where: { idUsuario },
      order: { fechaInicio: 'DESC' },
    });
  }

  findOne(idSesion: string) {
    return this.repo.findOneBy({ idSesion });
  }

  async cerrarSesion(idSesion: string) {
    return this.repo.update({ idSesion }, { activa: false });
  }

  async validarSesion(
    idUsuario: string,
    ipActual: string,
    dispositivoActual: string,
  ): Promise<boolean> {
    const sesiones = await this.repo.find({
      where: { idUsuario, activa: true },
      order: { fechaInicio: 'DESC' },
      take: 10,
    });

    if (sesiones.length === 0) return false;

    const dispositivoValido = sesiones.some(
      (s: Sesiones) => s.dispositivo === dispositivoActual,
    );
    if (!dispositivoValido) return false;

    const prefijo = (ip: string): string => ip.split('.').slice(0, 3).join('.');
    const prefijoActual = prefijo(ipActual);

    return sesiones.some(
      (s: Sesiones) => prefijo(s.ipAddress) === prefijoActual,
    );
  }
}
