import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Pagos } from '../../entities/Pagos';
import { Usuarios } from '../../entities/Usuarios';

@Injectable()
export class ReportesService {
  constructor(
    @InjectRepository(Pagos)
    private readonly pagosRepo: Repository<Pagos>,
    @InjectRepository(Usuarios)
    private readonly usuariosRepo: Repository<Usuarios>,
  ) {}

  async pagos() {
    const pagos = await this.pagosRepo.find({
      relations: ['idSubasta2', 'idComprador'],
      order: { fechaLimite: 'DESC' },
      take: 200,
    });
    return pagos.map((p) => ({
      idPago: p.idPago,
      tituloSubasta: p.idSubasta2?.titulo ?? '',
      comprador: p.idComprador?.nombreCompleto ?? '—',
      monto: p.monto,
      estado: p.estado,
      fechaLimite: p.fechaLimite,
      fechaPago: p.fechaPago,
      referencia: p.referenciaPasarela,
    }));
  }

  async usuarios() {
    const usuarios = await this.usuariosRepo.find({
      relations: ['usuarioRoles', 'usuarioRoles.idRol2'],
      order: { fechaRegistro: 'DESC' },
      take: 200,
    });
    return usuarios.map((u) => ({
      id: u.idUsuario,
      nombre: u.nombreCompleto,
      correo: u.correo,
      estado: u.estado,
      fechaRegistro: u.fechaRegistro,
      roles: (u.usuarioRoles ?? [])
        .map((ur) => ur.idRol2?.nombreRol)
        .filter((r): r is string => Boolean(r)),
    }));
  }
}
