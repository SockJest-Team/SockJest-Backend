import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Usuarios } from '../../entities/Usuarios';
import { Subastas } from '../../entities/Subastas';
import { Calificaciones } from '../../entities/Calificaciones';
import { apiError } from '../../common/utils/api-error';
import { ErrorCodes } from '../../common/constants/error-codes';
import { enmascararCorreo } from '../../common/utils/mask.util';

@Injectable()
export class VendedoresService {
  constructor(
    @InjectRepository(Usuarios)
    private readonly usuariosRepo: Repository<Usuarios>,
    @InjectRepository(Subastas)
    private readonly subastasRepo: Repository<Subastas>,
    @InjectRepository(Calificaciones)
    private readonly calificacionesRepo: Repository<Calificaciones>,
  ) {}

  async listar(buscar?: string) {
    const qb = this.usuariosRepo
      .createQueryBuilder('u')
      .innerJoin('u.usuarioRoles', 'ur')
      .innerJoin('ur.idRol2', 'rol')
      .where('rol.nombreRol IN (:...roles)', {
        roles: ['Subastador', 'Usuario', 'Admin'],
      })
      .distinct(true);

    if (buscar?.trim()) {
      qb.andWhere('u.nombreCompleto ILIKE :q', { q: `%${buscar.trim()}%` });
    }

    const vendedores = await qb.getMany();
    const reputaciones = await this.mapaReputaciones(
      vendedores.map((v) => v.idUsuario),
    );

    return vendedores.map((v) => ({
      id: v.idUsuario,
      nombre: v.nombreCompleto,
      reputacion: reputaciones.get(v.idUsuario) ?? { promedio: 0, total: 0 },
    }));
  }

  async perfil(idVendedor: string) {
    const vendedor = await this.usuariosRepo.findOne({
      where: { idUsuario: idVendedor },
    });
    if (!vendedor) {
      throw apiError(
        HttpStatus.NOT_FOUND,
        'VENDEDOR_NO_ENCONTRADO',
        'Este vendedor no existe.',
      );
    }

    const subastas = await this.subastasRepo.find({
      where: {
        idSubastador: { idUsuario: idVendedor } as Subastas['idSubastador'],
        estado: In(['Aprobada', 'Activa', 'Finalizada']),
      },
      relations: ['idCategoria2', 'imagenes'],
      order: { fechaInicio: 'DESC' },
    });

    const calificaciones = await this.calificacionesRepo.find({
      where: { idSubastador: idVendedor },
      relations: ['idComprador'],
      order: { fecha: 'DESC' },
      take: 50,
    });

    const reputaciones = await this.mapaReputaciones([idVendedor]);
    const reputacion = reputaciones.get(idVendedor) ?? {
      promedio: 0,
      total: calificaciones.length,
    };

    return {
      id: vendedor.idUsuario,
      nombre: vendedor.nombreCompleto,
      desde: vendedor.fechaRegistro,
      reputacion,
      subastasActivas: subastas.filter((s) => s.estado === 'Activa').length,
      subastas: subastas.map((s) => ({
        idSubasta: s.idSubasta,
        titulo: s.titulo,
        estado: s.estado,
        precioBase: s.precioBase,
        fechaFin: s.fechaFin,
        categoria: s.idCategoria2?.nombre ?? null,
        imagen: s.imagenes?.[0]?.url ?? null,
      })),
      calificaciones: calificaciones.map((c) => ({
        puntuacion: c.puntuacion,
        comentario: c.comentario,
        fecha: c.fecha,
        comprador: enmascararCorreo(c.idComprador?.correo),
      })),
    };
  }

  private async mapaReputaciones(
    ids: string[],
  ): Promise<Map<string, { promedio: number; total: number }>> {
    const mapa = new Map<string, { promedio: number; total: number }>();
    if (ids.length === 0) return mapa;

    const rows = await this.calificacionesRepo
      .createQueryBuilder('c')
      .select('c.idSubastador', 'idSubastador')
      .addSelect('ROUND(AVG(c.puntuacion)::numeric, 1)', 'promedio')
      .addSelect('COUNT(*)', 'total')
      .where('c.idSubastador IN (:...ids)', { ids })
      .groupBy('c.idSubastador')
      .getRawMany<{ idSubastador: string; promedio: string; total: string }>();

    for (const r of rows) {
      mapa.set(r.idSubastador, {
        promedio: Number(r.promedio),
        total: Number(r.total),
      });
    }
    return mapa;
  }
}
