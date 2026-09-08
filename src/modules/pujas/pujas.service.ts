import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Pujas } from '../../entities/Pujas';
import { Subastas } from '../../entities/Subastas';
import { ReservasAcceso } from '../../entities/ReservasAcceso';
import { apiError } from '../../common/utils/api-error';
import { ErrorCodes } from '../../common/constants/error-codes';
import { enmascararCorreo } from '../../common/utils/mask.util';
import { SalaStateService } from '../../common/services/sala-state.service';
import { UserRolesService } from '../../common/user-roles.service';

export const VENTANA_CRITICA_MS = 30_000;
export const EXTENSION_MS = 30_000;

export interface PujaPublica {
  id: string;
  monto: number;
  usuario: string;
  fecha: string;
}

export interface SnapshotSubasta {
  subastaId: string;
  estado: string;
  idSubastador: string;
  esDueño: boolean;
  esPrivada: boolean;
  totalPujas: number;
  limiteUsuariosConcurrentes: number | null;
  precioBase: number;
  precioActual: number;
  incrementoMinimoPct: number;
  fechaFin: string;
  servidorAhora: number;
  participantes: number;
  historial: PujaPublica[];
}

export interface ResultadoPuja {
  puja: PujaPublica;
  superadoId: string | null;
  fechaFinNueva: Date | null;
}

@Injectable()
export class PujasService {
  constructor(
    @InjectRepository(Pujas)
    private readonly pujasRepo: Repository<Pujas>,
    @InjectRepository(Subastas)
    private readonly subastasRepo: Repository<Subastas>,
    @InjectRepository(ReservasAcceso)
    private readonly reservasRepo: Repository<ReservasAcceso>,
    private readonly dataSource: DataSource,
    private readonly salaState: SalaStateService,
    private readonly userRolesService: UserRolesService,
  ) {}

  async getSnapshot(
    subastaId: string,
    requesterId?: string,
  ): Promise<SnapshotSubasta> {
    const subasta = await this.subastasRepo.findOne({
      where: { idSubasta: subastaId },
      relations: ['idSubastador'],
    });
    if (!subasta) {
      throw apiError(
        HttpStatus.NOT_FOUND,
        ErrorCodes.SUBASTA_NO_ENCONTRADA,
        'La subasta no existe.',
      );
    }

    if (subasta.esPrivada) {
      const esSubastador = requesterId === subasta.idSubastador.idUsuario;
      const tieneReserva = requesterId
        ? !!(await this.reservasRepo.findOne({
            where: {
              idSubasta: subastaId,
              idComprador: requesterId,
              estado: 'Aceptada',
            },
          }))
        : false;
      const roles = requesterId
        ? await this.userRolesService.getRolesByUsuario(requesterId)
        : [];
      const esAdmin = roles.includes('Admin');

      if (!esSubastador && !esAdmin && !tieneReserva) {
        throw apiError(
          HttpStatus.FORBIDDEN,
          ErrorCodes.SUBASTA_PRIVADA,
          'Esta subasta es privada y requiere invitación.',
        );
      }
    }

    const historial = await this.pujasRepo.find({
      where: { idSubasta: subastaId },
      relations: ['idUsuario2'],
      order: { fechaRegistro: 'DESC' },
      take: 20,
    });

    const totalPujas = await this.pujasRepo.count({
      where: { idSubasta: subastaId },
    });

    const pujaVigente = historial.find((p) => p.estado === 'Ganadora') ?? null;
    const precioActual = pujaVigente
      ? Number(pujaVigente.monto)
      : Number(subasta.precioBase);

    return {
      subastaId,
      estado: subasta.estado,
      idSubastador: subasta.idSubastador.idUsuario,
      esDueño: requesterId
        ? subasta.idSubastador.idUsuario === requesterId
        : false,
      esPrivada: subasta.esPrivada,
      totalPujas,
      limiteUsuariosConcurrentes: subasta.limiteUsuariosConcurrentes,
      precioBase: Number(subasta.precioBase),
      precioActual,
      incrementoMinimoPct: Number(subasta.incrementoMinimoPct),
      fechaFin: subasta.fechaFin.toISOString(),
      servidorAhora: Date.now(),
      participantes: this.salaState.contarCompradores(subastaId),
      historial: historial.map((p) => ({
        id: p.idPuja,
        monto: Number(p.monto),
        usuario: enmascararCorreo(p.idUsuario2?.correo),
        fecha: p.fechaRegistro.toISOString(),
      })),
    };
  }

  async registrarPuja(
    payload: { subastaId: string; monto: number },
    usuario: { userId: string; email: string },
    meta: { ip: string; dispositivo: string },
  ): Promise<ResultadoPuja> {
    const { subastaId } = payload;
    const monto = Number(payload.monto);

    if (!Number.isFinite(monto) || monto <= 0) {
      throw apiError(
        HttpStatus.BAD_REQUEST,
        ErrorCodes.PUJA_INVALIDA,
        'El monto de la puja debe ser un número mayor a cero.',
      );
    }

    const ahora = Date.now();
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const locked = await queryRunner.manager
        .getRepository(Subastas)
        .createQueryBuilder('s')
        .setLock('pessimistic_write')
        .where('s.idSubasta = :id', { id: subastaId })
        .getOne();

      if (!locked) {
        throw apiError(
          HttpStatus.NOT_FOUND,
          ErrorCodes.SUBASTA_NO_ENCONTRADA,
          'La subasta no existe.',
        );
      }

      const subasta = await queryRunner.manager.findOne(Subastas, {
        where: { idSubasta: subastaId },
        relations: ['idSubastador'],
      });

      if (!subasta) {
        throw apiError(
          HttpStatus.NOT_FOUND,
          ErrorCodes.SUBASTA_NO_ENCONTRADA,
          'La subasta no existe.',
        );
      }

      if (
        subasta.estado === 'Finalizada' ||
        subasta.fechaFin.getTime() <= ahora
      ) {
        throw apiError(
          HttpStatus.CONFLICT,
          ErrorCodes.SUBASTA_CERRADA,
          'La subasta ya finalizó.',
        );
      }
      if (
        subasta.estado !== 'Activa' ||
        subasta.fechaInicio.getTime() > ahora
      ) {
        throw apiError(
          HttpStatus.CONFLICT,
          ErrorCodes.SUBASTA_NO_INICIADA,
          'La subasta aún no está en curso.',
        );
      }
      if (subasta.idSubastador.idUsuario === usuario.userId) {
        throw apiError(
          HttpStatus.FORBIDDEN,
          ErrorCodes.PUJA_PROPIA_SUBASTA,
          'No puedes pujar en tu propia subasta.',
        );
      }

      if (subasta.requiereReserva || subasta.esPrivada) {
        const acceso = await queryRunner.manager
          .getRepository(ReservasAcceso)
          .findOne({
            where: {
              idSubasta: subastaId,
              idComprador: usuario.userId,
              estado: 'Aceptada',
            },
          });
        if (!acceso) {
          throw apiError(
            HttpStatus.FORBIDDEN,
            ErrorCodes.RESERVA_REQUERIDA,
            'Esta subasta requiere reserva aprobada para poder pujar.',
          );
        }
      }

      const pujasRepo = queryRunner.manager.getRepository(Pujas);
      const totalPujas = await pujasRepo.count({
        where: { idSubasta: subastaId },
      });
      const pujaVigente = await pujasRepo.findOne({
        where: { idSubasta: subastaId, estado: 'Ganadora' },
      });

      const precioBase = Number(subasta.precioBase);
      const pct = Number(subasta.incrementoMinimoPct);
      const redondear = (n: number) => Math.round(n * 100) / 100;

      if (totalPujas === 0) {
        if (monto < precioBase) {
          throw apiError(
            HttpStatus.BAD_REQUEST,
            ErrorCodes.PUJA_INVALIDA,
            `La primera puja debe ser mayor o igual al precio base (${precioBase}).`,
          );
        }
      } else if (totalPujas === 1) {
        const primera = Number(pujaVigente!.monto);
        const minimo = redondear(primera * (1 + pct / 100));
        if (monto < minimo) {
          throw apiError(
            HttpStatus.BAD_REQUEST,
            ErrorCodes.PUJA_INVALIDA,
            `La segunda puja debe ser de al menos ${minimo} (precio + ${pct}% de incremento).`,
          );
        }
      } else {
        const actual = Number(pujaVigente!.monto);
        if (monto <= actual) {
          throw apiError(
            HttpStatus.CONFLICT,
            ErrorCodes.PUJA_INVALIDA,
            `Tu puja fue superada instantáneamente por otra de mayor valor. El precio actual es ${actual}.`,
          );
        }
      }

      const nuevaPuja = pujasRepo.create({
        idSubasta: subastaId,
        idUsuario: usuario.userId,
        monto: redondear(monto).toFixed(2),
        timestampMs: String(ahora),
        ipAddress: meta.ip || '0.0.0.0', // inet no acepta vacío
        dispositivo: (meta.dispositivo || 'Desconocido').slice(0, 255),
        estado: 'Ganadora',
        fechaRegistro: new Date(),
      });
      await pujasRepo.save(nuevaPuja);

      let superadoId: string | null = null;
      if (pujaVigente) {
        await pujasRepo.update(pujaVigente.idPuja, {
          estado: 'Perdedora',
        });
        superadoId = pujaVigente.idUsuario;
      }

      let fechaFinNueva: Date | null = null;
      const restante = subasta.fechaFin.getTime() - ahora;
      if (restante > 0 && restante <= VENTANA_CRITICA_MS) {
        fechaFinNueva = new Date(ahora + EXTENSION_MS);
        await queryRunner.manager
          .getRepository(Subastas)
          .update(subastaId, { fechaFin: fechaFinNueva });
      }

      await queryRunner.commitTransaction();

      return {
        puja: {
          id: nuevaPuja.idPuja,
          monto: Number(nuevaPuja.monto),
          usuario: enmascararCorreo(usuario.email),
          fecha: nuevaPuja.fechaRegistro.toISOString(),
        },
        superadoId,
        fechaFinNueva,
      };
    } catch (e) {
      await queryRunner.rollbackTransaction();
      throw e;
    } finally {
      await queryRunner.release();
    }
  }
}
