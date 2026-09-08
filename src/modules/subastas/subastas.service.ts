import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Subastas } from '../../entities/Subastas';
import { SubastaImagenes } from '../../entities/SubastaImagenes';
import { Categorias } from '../../entities/Categorias';
import { ReservasAcceso } from '../../entities/ReservasAcceso';
import { Notificaciones } from '../../entities/Notificaciones';
import { SubastaHistorialEstados } from '../../entities/SubastaHistorialEstados';
import { CreateSubastaDto } from './dto/create-subasta.dto';
import { UpdateSubastaDto } from './dto/update-subasta.dto';
import { FiltroSubastasDto } from './dto/filtro-subastas.dto';
import { ImageModerationService } from '../../common/services/image-moderation.service';
import { UserRolesService } from '../../common/user-roles.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { apiError } from '../../common/utils/api-error';
import { ErrorCodes } from '../../common/constants/error-codes';
import { enmascararCorreo } from '../../common/utils/mask.util';
import {
  COMISION_PLATAFORMA_PCT,
  ESTADOS_CATALOGO,
  INCREMENTO_MINIMO_DEFAULT,
  MAX_IMAGENES_POR_SUBASTA,
  TRANSICIONES_ESTADOS,
} from './constants/subasta.constants';

export const VISIBLE_TRAS_CIERRE_MS = 5 * 60 * 1000;

interface EstadisticasResult {
  total_subastas: string;
  total_ventas: string;
  promedio_venta: string;
}

@Injectable()
export class SubastasService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Subastas) private readonly repo: Repository<Subastas>,
    @InjectRepository(SubastaImagenes)
    private readonly imagenesRepo: Repository<SubastaImagenes>,
    @InjectRepository(Categorias)
    private readonly categoriasRepo: Repository<Categorias>,
    @InjectRepository(ReservasAcceso)
    private readonly reservasRepo: Repository<ReservasAcceso>,
    private readonly moderationService: ImageModerationService,
    private readonly userRolesService: UserRolesService,
    private readonly notificationsGateway: NotificationsGateway,
  ) {}

  async create(dto: CreateSubastaDto, idSubastador: string): Promise<Subastas> {
    const categoria = await this.categoriasRepo.findOneBy({
      idCategoria: dto.idCategoria,
    });
    if (!categoria || !categoria.activa) {
      throw apiError(
        HttpStatus.NOT_FOUND,
        ErrorCodes.CATEGORIA_NO_ENCONTRADA,
        'La categoría seleccionada no existe o está inactiva.',
      );
    }

    this.validarFechas(dto.fechaInicio, dto.fechaFin);

    const imagenes = dto.imagenes ?? [];
    if (imagenes.length > MAX_IMAGENES_POR_SUBASTA) {
      throw apiError(
        HttpStatus.BAD_REQUEST,
        ErrorCodes.DATOS_INVALIDOS,
        `Máximo ${MAX_IMAGENES_POR_SUBASTA} imágenes por subasta.`,
      );
    }

    for (const imagen of imagenes) {
      await this.moderationService.checkImage(imagen);
    }

    return this.dataSource.transaction(async (em) => {
      const subasta = em.create(Subastas, {
        titulo: dto.titulo,
        descripcion: dto.descripcion ?? null,
        politicaEnvio: dto.politicaEnvio,
        precioBase: Number(dto.precioBase).toFixed(2),
        incrementoMinimoPct: Number(
          dto.incrementoMinimoPct ?? INCREMENTO_MINIMO_DEFAULT,
        ).toFixed(2),
        requiereReserva: dto.requiereReserva ?? false,
        esPrivada: dto.esPrivada ?? false,
        limiteUsuariosConcurrentes: dto.limiteUsuariosConcurrentes ?? 2,
        estado: 'Pendiente',
        fechaInicio: new Date(dto.fechaInicio),
        fechaFin: new Date(dto.fechaFin),
        idCategoria: dto.idCategoria,
        idSubastador: { idUsuario: idSubastador } as Subastas['idSubastador'],
      });
      const guardada = await em.save(subasta);

      if (imagenes.length > 0) {
        await em.save(
          imagenes.map((url, index) =>
            em.create(SubastaImagenes, {
              idSubasta: guardada.idSubasta,
              url,
              esPrincipal: index === 0,
              orden: index,
            }),
          ),
        );
      }
      return guardada;
    });
  }

  async findAll(filtros: FiltroSubastasDto) {
    const query = this.repo.createQueryBuilder('subasta');
    query.leftJoinAndSelect('subasta.idCategoria2', 'categoria');
    query.leftJoinAndSelect('subasta.imagenes', 'imagen');

    query.where(
      `(subasta.estado IN (:...estados) OR
        (subasta.estado = 'Finalizada' AND subasta.fechaFin >= :limiteFinalizadas))`,
      {
        estados: ESTADOS_CATALOGO,
        limiteFinalizadas: new Date(Date.now() - VISIBLE_TRAS_CIERRE_MS),
      },
    );
    query.andWhere('subasta.esPrivada = :noPrivada', { noPrivada: false });

    if (filtros.categoria) {
      query.andWhere('categoria.nombre = :cat', { cat: filtros.categoria });
    }
    if (filtros.precioMin !== undefined) {
      query.andWhere('subasta.precioBase >= :min', { min: filtros.precioMin });
    }
    if (filtros.precioMax !== undefined) {
      query.andWhere('subasta.precioBase <= :max', { max: filtros.precioMax });
    }
    if (filtros.buscar) {
      query.andWhere(
        '(subasta.titulo ILIKE :search OR subasta.descripcion ILIKE :search)',
        { search: `%${filtros.buscar}%` },
      );
    }

    query
      .orderBy('subasta.fechaInicio', 'DESC')
      .addOrderBy('imagen.orden', 'ASC');

    query.take(filtros.limit ?? 50);
    query.skip(filtros.offset ?? 0);

    return query.getMany();
  }

  async calcularEstadisticas(userId: string) {
    const stats = await this.repo
      .createQueryBuilder('subasta')
      .select('COUNT(DISTINCT subasta.idSubasta)', 'total_subastas')
      .addSelect('COALESCE(SUM(pujaGanadora.monto), 0)', 'total_ventas')
      .addSelect('COALESCE(AVG(pujaGanadora.monto), 0)', 'promedio_venta')
      .leftJoin('subasta.idSubastador', 'subastador')
      .leftJoin(
        'subasta.pujas',
        'pujaGanadora',
        'pujaGanadora.estado = :estadoPuja',
        { estadoPuja: 'Ganadora' },
      )
      .where('subastador.idUsuario = :userId', { userId })
      .andWhere('subasta.estado = :estado', { estado: 'Finalizada' })
      .getRawOne<EstadisticasResult>();

    const totalVentas = parseFloat(stats?.total_ventas ?? '0') || 0;
    const comision = totalVentas * COMISION_PLATAFORMA_PCT;

    return {
      totalSubastas: parseInt(stats?.total_subastas ?? '0', 10) || 0,
      totalVentas,
      comision,
      totalGanado: totalVentas - comision,
      promedioVenta: parseFloat(stats?.promedio_venta ?? '0') || 0,
    };
  }

  async findOne(idSubasta: string): Promise<Subastas> {
    if (!idSubasta || ['undefined', 'null', ''].includes(idSubasta)) {
      throw apiError(
        HttpStatus.NOT_FOUND,
        ErrorCodes.SUBASTA_NO_ENCONTRADA,
        'Subasta inválida.',
      );
    }

    const subasta = await this.repo.findOneBy({ idSubasta });
    if (!subasta) {
      throw apiError(
        HttpStatus.NOT_FOUND,
        ErrorCodes.SUBASTA_NO_ENCONTRADA,
        'Esta subasta ya no está disponible.',
      );
    }
    return subasta;
  }

  private async findConSubastador(idSubasta: string): Promise<Subastas> {
    const subasta = await this.repo.findOne({
      where: { idSubasta },
      relations: ['idSubastador'],
    });
    if (!subasta) {
      throw apiError(
        HttpStatus.NOT_FOUND,
        ErrorCodes.SUBASTA_NO_ENCONTRADA,
        'Esta subasta ya no está disponible.',
      );
    }
    return subasta;
  }

  private asegurarPropietario(subasta: Subastas, idUsuario: string): void {
    if (subasta.idSubastador?.idUsuario !== idUsuario) {
      throw apiError(
        HttpStatus.FORBIDDEN,
        ErrorCodes.SUBASTA_NO_PROPIA,
        'Solo el dueño de esta subasta puede realizar esta acción.',
      );
    }
  }

  findAllBySubastador(idSubastador: string) {
    return this.repo.find({
      where: {
        idSubastador: { idUsuario: idSubastador } as Subastas['idSubastador'],
      },
      relations: ['idCategoria2', 'imagenes'],
      order: { fechaCreacion: 'DESC' },
    });
  }

  async update(
    idSubasta: string,
    dto: UpdateSubastaDto,
    idUsuarioSolicitante: string,
  ): Promise<Subastas> {
    const subasta = await this.findConSubastador(idSubasta);
    this.asegurarPropietario(subasta, idUsuarioSolicitante);

    if (subasta.estado !== 'Pendiente') {
      throw apiError(
        HttpStatus.CONFLICT,
        ErrorCodes.SUBASTA_NO_EDITABLE,
        'Solo puedes editar la subasta mientras esté en revisión (Pendiente).',
      );
    }

    const cambios: Partial<Subastas> = {};
    if (dto.titulo !== undefined) cambios.titulo = dto.titulo;
    if (dto.descripcion !== undefined) cambios.descripcion = dto.descripcion;
    if (dto.politicaEnvio !== undefined)
      cambios.politicaEnvio = dto.politicaEnvio;
    if (dto.precioBase !== undefined) {
      cambios.precioBase = Number(dto.precioBase).toFixed(2);
    }
    if (dto.incrementoMinimoPct !== undefined) {
      cambios.incrementoMinimoPct = Number(dto.incrementoMinimoPct).toFixed(2);
    }
    if (dto.fechaInicio !== undefined)
      cambios.fechaInicio = new Date(dto.fechaInicio);
    if (dto.fechaFin !== undefined) cambios.fechaFin = new Date(dto.fechaFin);
    if (dto.idCategoria !== undefined) cambios.idCategoria = dto.idCategoria;

    this.validarFechas(
      cambios.fechaInicio ?? subasta.fechaInicio,
      cambios.fechaFin ?? subasta.fechaFin,
    );

    if (dto.idCategoria !== undefined) {
      const categoria = await this.categoriasRepo.findOneBy({
        idCategoria: dto.idCategoria,
      });
      if (!categoria?.activa) {
        throw apiError(
          HttpStatus.NOT_FOUND,
          ErrorCodes.CATEGORIA_NO_ENCONTRADA,
          'La categoría seleccionada no existe o está inactiva.',
        );
      }
    }

    if (dto.imagenes !== undefined) {
      if (dto.imagenes.length > MAX_IMAGENES_POR_SUBASTA) {
        throw apiError(
          HttpStatus.BAD_REQUEST,
          ErrorCodes.DATOS_INVALIDOS,
          `Máximo ${MAX_IMAGENES_POR_SUBASTA} imágenes por subasta.`,
        );
      }
      for (const imagen of dto.imagenes) {
        await this.moderationService.checkImage(imagen);
      }
    }

    return this.dataSource.transaction(async (em) => {
      if (Object.keys(cambios).length > 0) {
        await em.update(Subastas, { idSubasta }, cambios);
      }
      if (dto.imagenes !== undefined) {
        await em.delete(SubastaImagenes, { idSubasta });
        if (dto.imagenes.length > 0) {
          await em.save(
            dto.imagenes.map((url, index) =>
              em.create(SubastaImagenes, {
                idSubasta,
                url,
                esPrincipal: index === 0,
                orden: index,
              }),
            ),
          );
        }
      }
      return this.findConSubastador(idSubasta);
    });
  }

  async remove(idSubasta: string, idUsuarioSolicitante: string) {
    const subasta = await this.findConSubastador(idSubasta);
    this.asegurarPropietario(subasta, idUsuarioSolicitante);

    if (subasta.estado !== 'Pendiente') {
      throw apiError(
        HttpStatus.CONFLICT,
        ErrorCodes.SUBASTA_NO_ELIMINABLE,
        'Solo se pueden eliminar subastas en revisión (Pendiente).',
      );
    }

    await this.repo.delete({ idSubasta });
    return { idSubasta, eliminada: true };
  }

  async cambiarEstado(
    idSubasta: string,
    nuevoEstado: string,
    idUsuarioResponsable?: string,
  ) {
    const subasta = await this.findOne(idSubasta);
    const estadoAnterior = subasta.estado;

    const permitidos = TRANSICIONES_ESTADOS[subasta.estado] ?? [];
    if (!permitidos.includes(nuevoEstado)) {
      throw apiError(
        HttpStatus.CONFLICT,
        ErrorCodes.ESTADO_INVALIDO,
        `No se puede pasar una subasta de "${subasta.estado}" a "${nuevoEstado}".`,
      );
    }

    subasta.estado = nuevoEstado;
    if (nuevoEstado === 'Aprobada') {
      subasta.fechaAprobacion = new Date();
      if (idUsuarioResponsable) {
        subasta.idAdminAprobador = {
          idUsuario: idUsuarioResponsable,
        } as Subastas['idAdminAprobador'];
      }
    }

    await this.repo.manager.getRepository(SubastaHistorialEstados).save(
      this.repo.manager.getRepository(SubastaHistorialEstados).create({
        estadoAnterior,
        estadoNuevo: nuevoEstado,
        idSubasta: { idSubasta } as SubastaHistorialEstados['idSubasta'],
        ...(idUsuarioResponsable && {
          idUsuarioResponsable: {
            idUsuario: idUsuarioResponsable,
          } as SubastaHistorialEstados['idUsuarioResponsable'],
        }),
      }),
    );

    const guardada = await this.repo.save(subasta);

    if (nuevoEstado === 'Aprobada') {
      try {
        const subastadorId = subasta.idSubastador?.idUsuario;
        if (subastadorId) {
          await this.repo.manager.getRepository(Notificaciones).save(
            this.repo.manager.getRepository(Notificaciones).create({
              idUsuario: subastadorId,
              idUsuario2: {
                idUsuario: subastadorId,
              } as Notificaciones['idUsuario2'],
              idSubasta: { idSubasta } as Notificaciones['idSubasta'],
              tipo: 'Aprobacion',
              mensaje: `Tu lote «${subasta.titulo}» fue aprobado. Se activará en su fecha de inicio.`,
              canal: 'WebSocket',
            }),
          );
          this.notificationsGateway.notificarUsuario(subastadorId, {
            tipo: 'APROBACION',
            titulo: 'Subasta aprobada',
            mensaje: `Tu lote «${subasta.titulo}» fue aprobado. Se activará en su fecha de inicio.`,
            idSubasta,
          });
        }
      } catch {
        /* el push nunca rompe la aprobación */
      }
    }

    return guardada;
  }

  async rechazarSubasta(
    idSubasta: string,
    motivo: string,
    idAdminResponsable?: string,
  ) {
    const motivoLimpio = motivo?.trim();
    if (!motivoLimpio) {
      throw apiError(
        HttpStatus.BAD_REQUEST,
        ErrorCodes.MOTIVO_REQUERIDO,
        'Debes indicar el motivo del rechazo.',
      );
    }

    const subasta = await this.findConSubastador(idSubasta);
    if (subasta.estado !== 'Pendiente') {
      throw apiError(
        HttpStatus.CONFLICT,
        ErrorCodes.ESTADO_INVALIDO,
        'Solo se pueden rechazar subastas en revisión (Pendiente).',
      );
    }

    const estadoAnterior = subasta.estado;
    subasta.estado = 'Rechazada';
    subasta.motivoRechazo = motivoLimpio;

    await this.repo.manager.getRepository(SubastaHistorialEstados).save(
      this.repo.manager.getRepository(SubastaHistorialEstados).create({
        estadoAnterior,
        estadoNuevo: 'Rechazada',
        idSubasta: { idSubasta } as SubastaHistorialEstados['idSubasta'],
        ...(idAdminResponsable && {
          idUsuarioResponsable: {
            idUsuario: idAdminResponsable,
          } as SubastaHistorialEstados['idUsuarioResponsable'],
        }),
      }),
    );

    const guardada = await this.repo.save(subasta);

    try {
      const subastadorId = subasta.idSubastador?.idUsuario;
      if (subastadorId) {
        await this.repo.manager.getRepository(Notificaciones).save(
          this.repo.manager.getRepository(Notificaciones).create({
            idUsuario: subastadorId,
            idUsuario2: {
              idUsuario: subastadorId,
            } as Notificaciones['idUsuario2'],
            idSubasta: { idSubasta } as Notificaciones['idSubasta'],
            tipo: 'Rechazo',
            mensaje: `Tu lote «${subasta.titulo}» fue rechazado: ${motivoLimpio}`,
            canal: 'WebSocket',
          }),
        );
        this.notificationsGateway.notificarUsuario(subastadorId, {
          tipo: 'RECHAZO',
          titulo: 'Subasta rechazada',
          mensaje: `Tu lote «${subasta.titulo}» fue rechazado: ${motivoLimpio}`,
          idSubasta,
        });
      }
    } catch {
      /* el push nunca rompe el rechazo */
    }

    return guardada;
  }

  async inscribirse(idSubasta: string, userId: string) {
    const subasta = await this.findConSubastador(idSubasta);

    if (subasta.idSubastador?.idUsuario === userId) {
      throw apiError(
        HttpStatus.FORBIDDEN,
        ErrorCodes.SUBASTA_NO_PROPIA,
        'No puedes inscribirte a tu propia subasta.',
      );
    }

    const yaInscrito = await this.reservasRepo.findOneBy({
      idSubasta,
      idComprador: userId,
    });
    if (yaInscrito) {
      throw apiError(
        HttpStatus.CONFLICT,
        'YA_INSCRITO',
        'Ya estás inscrito en esta subasta.',
      );
    }

    const estado =
      subasta.requiereReserva || subasta.esPrivada ? 'Pendiente' : 'Aceptada';

    await this.reservasRepo.save(
      this.reservasRepo.create({
        idSubasta,
        idSubasta2: { idSubasta } as ReservasAcceso['idSubasta2'],
        idComprador: userId,
        idComprador2: { idUsuario: userId } as ReservasAcceso['idComprador2'],
        estado,
      }),
    );

    return {
      inscrito: true,
      estado,
      mensaje:
        estado === 'Aceptada'
          ? '¡Inscripción confirmada! Te avisaremos cuando comience la puja.'
          : 'Solicitud enviada. El subastador la responderá.',
    };
  }

  async cancelarInscripcion(idSubasta: string, userId: string) {
    const inscripcion = await this.reservasRepo.findOneBy({
      idSubasta,
      idComprador: userId,
    });
    if (!inscripcion) {
      throw apiError(
        HttpStatus.NOT_FOUND,
        'NO_INSCRITO',
        'No tienes una inscripción en esta subasta.',
      );
    }
    await this.reservasRepo.delete({ idReserva: inscripcion.idReserva });
    return { cancelada: true, mensaje: 'Inscripción cancelada.' };
  }

  async cerrarSiHaTerminado(idSubasta: string) {
    const subasta = await this.findOne(idSubasta);
    if (subasta.estado !== 'Activa') return subasta;

    if (new Date() >= subasta.fechaFin) {
      subasta.estado = 'Finalizada';
      return this.repo.save(subasta);
    }
    return subasta;
  }

  async findDetalle(idSubasta: string, userId?: string | null) {
    const subasta = await this.repo.findOne({
      where: { idSubasta },
      relations: ['idCategoria2', 'imagenes', 'idSubastador', 'idGanador'],
    });
    if (!subasta) {
      throw apiError(
        HttpStatus.NOT_FOUND,
        ErrorCodes.SUBASTA_NO_ENCONTRADA,
        'Esta subasta ya no está disponible.',
      );
    }

    if (subasta.esPrivada) {
      const tieneAcceso = userId
        ? await this.puedeAccederSala(idSubasta, userId)
        : false;
      if (!tieneAcceso) {
        return { bloqueada: true, titulo: subasta.titulo };
      }
    }

    return { bloqueada: false, subasta: this.mapearDetalle(subasta, userId) };
  }

  async puedeAccederSala(idSubasta: string, userId: string): Promise<boolean> {
    const subasta = await this.repo.findOne({
      where: { idSubasta },
      relations: ['idSubastador'],
    });
    if (!subasta) return false;
    if (!subasta.esPrivada) return true;
    if (subasta.idSubastador?.idUsuario === userId) return true;

    const roles = await this.userRolesService.getRolesByUsuario(userId);
    if (roles.includes('Admin')) return true;

    const reserva = await this.reservasRepo.findOneBy({
      idSubasta,
      idComprador: userId,
      estado: 'Aceptada',
    });
    return reserva !== null;
  }

  async findPendientes(): Promise<Subastas[]> {
    return this.repo.find({
      where: { estado: 'Pendiente' },
      relations: ['idCategoria2', 'imagenes', 'idSubastador'],
      order: { fechaCreacion: 'ASC' },
    });
  }

  private validarFechas(inicio: string | Date, fin: string | Date): void {
    const fInicio = new Date(inicio);
    const fFin = new Date(fin);

    if (Number.isNaN(fInicio.getTime()) || Number.isNaN(fFin.getTime())) {
      throw apiError(
        HttpStatus.BAD_REQUEST,
        ErrorCodes.FECHAS_INVALIDAS,
        'Las fechas enviadas no son válidas.',
      );
    }
    if (fInicio.getTime() <= Date.now()) {
      throw apiError(
        HttpStatus.BAD_REQUEST,
        ErrorCodes.FECHAS_INVALIDAS,
        'La fecha de inicio debe ser en el futuro.',
      );
    }
    if (fFin <= fInicio) {
      throw apiError(
        HttpStatus.BAD_REQUEST,
        ErrorCodes.FECHAS_INVALIDAS,
        'La fecha de fin debe ser posterior a la de inicio.',
      );
    }
  }

  private mapearDetalle(s: Subastas, userId?: string | null) {
    return {
      idSubasta: s.idSubasta,
      titulo: s.titulo,
      descripcion: s.descripcion,
      politicaEnvio: s.politicaEnvio,
      precioBase: s.precioBase,
      incrementoMinimoPct: s.incrementoMinimoPct,
      requiereReserva: s.requiereReserva,
      esPrivada: s.esPrivada,
      estado: s.estado,
      motivoRechazo: s.motivoRechazo,
      fechaInicio: s.fechaInicio,
      fechaFin: s.fechaFin,
      categoria: s.idCategoria2
        ? { id: s.idCategoria2.idCategoria, nombre: s.idCategoria2.nombre }
        : null,
      imagenes: [...(s.imagenes ?? [])]
        .sort((a, b) => a.orden - b.orden)
        .map((i) => ({
          idImagen: i.idImagen,
          url: i.url,
          esPrincipal: i.esPrincipal,
        })),
      subastador: {
        id: s.idSubastador?.idUsuario ?? null,
        nombre: s.idSubastador?.nombreCompleto ?? 'Subastador',
        correo: enmascararCorreo(s.idSubastador?.correo),
      },
      esGanador: Boolean(userId && s.idGanador?.idUsuario === userId),
    };
  }
}
