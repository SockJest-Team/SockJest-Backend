import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Subastas } from '../../entities/Subastas';
import { CreateSubastaDto } from './dto/create-subasta.dto';
import { UpdateSubastaDto } from './dto/update-subasta.dto';
import { FiltroSubastasDto } from './dto/filtro-subastas.dto';

@Injectable()
export class SubastasService {
  constructor(
    @InjectRepository(Subastas) private readonly repo: Repository<Subastas>,
  ) {}

  create(dto: CreateSubastaDto, idSubastador: string) {
    const { precioBase, incrementoMinimoPct, ...resto } = dto;

    const nueva = this.repo.create({
      ...resto, // ya incluye idCategoria como string, sin problema
      precioBase: precioBase.toString(),
      incrementoMinimoPct: incrementoMinimoPct?.toString(),
      idSubastador: { idUsuario: idSubastador } as any, // esta sí la necesitas, porque idSubastador NO tiene columna plana, solo existe como relación
    });
    return this.repo.save(nueva);
  }

  async findAll(filtros: FiltroSubastasDto) {
    const query = this.repo.createQueryBuilder('subasta');
    query.leftJoinAndSelect('subasta.idCategoria2', 'categoria');

    query.where('subasta.estado IN (:...estados)', {
      estados: ['Aprobada', 'Activa', 'Finalizada'],
    });

    if (filtros.categoria) {
      query.andWhere('categoria.nombre = :cat', { cat: filtros.categoria });
    }
    if (filtros.precioMin) {
      query.andWhere('subasta.precioBase >= :min', { min: filtros.precioMin });
    }
    if (filtros.precioMax) {
      query.andWhere('subasta.precioBase <= :max', { max: filtros.precioMax });
    }
    if (filtros.buscar) {
      query.andWhere(
        '(subasta.titulo ILIKE :search OR subasta.descripcion ILIKE :search)',
        { search: `%${filtros.buscar}%` },
      );
    }

    return query.getMany();
  }

  async calcularEstadisticas(userId: string) {
    type EstadisticasResult = {
      total_subastas: string;
      total_ganado: string;
      promedio_venta: string;
    };

    const stats = await this.repo
      .createQueryBuilder('subasta')
      .select('COUNT(subasta.idSubasta)', 'total_subastas')
      .addSelect('COALESCE(SUM(subasta.precioBase), 0)', 'total_ganado')
      .addSelect('COALESCE(AVG(subasta.precioBase), 0)', 'promedio_venta')
      .leftJoin('subasta.idSubastador', 'subastador')
      .where('subastador.idUsuario = :userId', { userId })
      .andWhere('subasta.estado = :estado', { estado: 'Finalizada' })
      .getRawOne<EstadisticasResult>();

    if (!stats) {
      return {
        totalSubastas: 0,
        totalGanado: 0,
        promedioVenta: 0,
      };
    }

    return {
      totalSubastas: parseInt(stats.total_subastas, 10) || 0,
      totalGanado: parseFloat(stats.total_ganado) || 0,
      promedioVenta: parseFloat(stats.promedio_venta) || 0,
    };
  }

  async findOne(idSubasta: string) {
    const subasta = await this.repo.findOneBy({ idSubasta });
    if (!subasta) throw new NotFoundException('Subasta no encontrada');
    return subasta;
  }

  findAllBySubastador(idSubastador: string) {
    return this.repo.find({
      where: { idSubastador: { idUsuario: idSubastador } as any },
    });
  }

  async update(
    idSubasta: string,
    dto: UpdateSubastaDto,
    idUsuarioSolicitante: string,
  ) {
    const subasta = await this.findOne(idSubasta);

    if (subasta.idSubastador?.idUsuario !== idUsuarioSolicitante) {
      throw new ForbiddenException(
        'Solo el subastador dueño puede editar esta subasta',
      );
    }
    if (subasta.estado !== 'Pendiente') {
      throw new ForbiddenException(
        'Solo se puede editar mientras está en estado Pendiente',
      );
    }

    await this.repo.update({ idSubasta }, dto as any);
    return this.findOne(idSubasta);
  }

  async remove(idSubasta: string, idUsuarioSolicitante: string) {
    const subasta = await this.findOne(idSubasta);

    if (subasta.idSubastador?.idUsuario !== idUsuarioSolicitante) {
      throw new ForbiddenException(
        'Solo el subastador dueño puede eliminar esta subasta',
      );
    }
    if (subasta.estado !== 'Pendiente') {
      throw new ForbiddenException(
        'No se puede eliminar una subasta ya aprobada o activa',
      );
    }

    return this.repo.delete({ idSubasta });
  }

  async cambiarEstado(idSubasta: string, nuevoEstado: string) {
    const subasta = await this.findOne(idSubasta);
    subasta.estado = nuevoEstado;
    if (nuevoEstado === 'Aprobada') subasta.fechaAprobacion = new Date();
    return this.repo.save(subasta);
  }

  async rechazarSubasta(idSubasta: string, motivo: string) {
    const subasta = await this.findOne(idSubasta);
    subasta.estado = 'Rechazada';
    subasta.motivoRechazo = motivo;
    return this.repo.save(subasta);
  }

  async cerrarSiHaTerminado(idSubasta: string) {
    const subasta = await this.findOne(idSubasta);
    if (subasta.estado === 'Finalizada') return subasta;

    if (new Date() >= subasta.fechaFin) {
      subasta.estado = 'Finalizada';
      return this.repo.save(subasta);
    }
    return subasta;
  }
}
