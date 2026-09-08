import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ReservasAcceso } from '../../entities/ReservasAcceso';
import { Subastas } from '../../entities/Subastas';
import { Usuarios } from '../../entities/Usuarios';
import { Notificaciones } from '../../entities/Notificaciones';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { apiError } from '../../common/utils/api-error';
import { ErrorCodes } from '../../common/constants/error-codes';
import { enmascararCorreo } from '../../common/utils/mask.util';

@Injectable()
export class ReservasService {
  constructor(
    @InjectRepository(ReservasAcceso)
    private readonly reservasRepo: Repository<ReservasAcceso>,
    @InjectRepository(Subastas)
    private readonly subastasRepo: Repository<Subastas>,
    @InjectRepository(Usuarios)
    private readonly usuariosRepo: Repository<Usuarios>,
    private readonly dataSource: DataSource,
    private readonly notificationsGateway: NotificationsGateway,
  ) {}

  async misSolicitudes(idSubastador: string) {
    const subastas = await this.subastasRepo.find({
      where: {
        idSubastador: { idUsuario: idSubastador } as Subastas['idSubastador'],
      },
      select: { idSubasta: true },
    });
    if (subastas.length === 0) return [];

    const reservas = await this.reservasRepo.find({
      where: subastas.map((s) => ({ idSubasta: s.idSubasta })),
      relations: ['idComprador2', 'idSubasta2'],
      order: { fechaSolicitud: 'DESC' },
    });

    return reservas.map((r) => ({
      idReserva: r.idReserva,
      idSubasta: r.idSubasta,
      tituloSubasta: r.idSubasta2?.titulo ?? '',
      estado: r.estado,
      fechaSolicitud: r.fechaSolicitud,
      comprador: {
        id: r.idComprador2?.idUsuario ?? '',
        nombre: r.idComprador2?.nombreCompleto ?? 'Comprador',
        correo: enmascararCorreo(r.idComprador2?.correo),
      },
    }));
  }

  async miEstado(idSubasta: string, userId: string) {
    const reserva = await this.reservasRepo.findOne({
      where: { idSubasta, idComprador: userId },
    });
    return { estado: reserva?.estado ?? null };
  }

  async solicitar(idSubasta: string, userId: string) {
    const subasta = await this.subastasRepo.findOne({
      where: { idSubasta },
      relations: ['idSubastador'],
    });
    if (!subasta) {
      throw apiError(
        HttpStatus.NOT_FOUND,
        ErrorCodes.SUBASTA_NO_ENCONTRADA,
        'La subasta no existe.',
      );
    }
    if (subasta.idSubastador?.idUsuario === userId) {
      throw apiError(
        HttpStatus.FORBIDDEN,
        ErrorCodes.SUBASTA_NO_PROPIA,
        'No puedes solicitar acceso a tu propia subasta.',
      );
    }

    const existente = await this.reservasRepo.findOne({
      where: { idSubasta, idComprador: userId },
    });
    if (existente) {
      throw apiError(
        HttpStatus.CONFLICT,
        'YA_INSCRITO',
        existente.estado === 'Aceptada'
          ? 'Ya tienes acceso a esta subasta.'
          : 'Ya tienes una solicitud en revisión para esta subasta.',
      );
    }

    await this.reservasRepo.save(
      this.reservasRepo.create({
        idSubasta,
        idSubasta2: { idSubasta } as ReservasAcceso['idSubasta2'],
        idComprador: userId,
        idComprador2: { idUsuario: userId } as ReservasAcceso['idComprador2'],
        estado: 'Pendiente',
      }),
    );

    const subastadorId = subasta.idSubastador?.idUsuario;
    if (subastadorId) {
      const mensaje = `Un comprador solicitó acceso a «${subasta.titulo}». Respóndela desde Solicitudes.`;
      await this.crearNotificacion(subastadorId, idSubasta, 'Reserva', mensaje);
      void this.notificationsGateway.notificarUsuario(subastadorId, {
        tipo: 'RESERVA',
        titulo: 'Nueva solicitud de acceso',
        mensaje,
        idSubasta,
      });
    }

    return { mensaje: 'Solicitud enviada. El subastador la responderá.' };
  }

  async invitar(idSubasta: string, correo: string, idSubastador: string) {
    const correoLimpio = correo?.trim().toLowerCase();
    if (!correoLimpio || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(correoLimpio)) {
      throw apiError(
        HttpStatus.BAD_REQUEST,
        ErrorCodes.DATOS_INVALIDOS,
        'Ingresa un correo válido.',
      );
    }

    const subasta = await this.subastasRepo.findOne({
      where: { idSubasta },
    });
    if (!subasta) {
      throw apiError(
        HttpStatus.NOT_FOUND,
        ErrorCodes.SUBASTA_NO_ENCONTRADA,
        'La subasta no existe.',
      );
    }

    const esDueno = await this.subastasRepo.findOne({
      where: {
        idSubasta,
        idSubastador: { idUsuario: idSubastador } as Subastas['idSubastador'],
      },
    });
    if (!esDueno) {
      throw apiError(
        HttpStatus.FORBIDDEN,
        ErrorCodes.SUBASTA_NO_PROPIA,
        'Solo el dueño de esta subasta puede invitar.',
      );
    }

    const invitado = await this.usuariosRepo
      .createQueryBuilder('u')
      .where('LOWER(u.correo) = :correo', { correo: correoLimpio })
      .getOne();
    if (!invitado) {
      throw apiError(
        HttpStatus.NOT_FOUND,
        ErrorCodes.USUARIO_NO_ENCONTRADO,
        'Ese correo no tiene cuenta en LiveBid.',
      );
    }
    if (invitado.idUsuario === idSubastador) {
      throw apiError(
        HttpStatus.FORBIDDEN,
        ErrorCodes.SUBASTA_NO_PROPIA,
        'No puedes invitarte a tu propia subasta.',
      );
    }

    const existente = await this.reservasRepo.findOne({
      where: { idSubasta, idComprador: invitado.idUsuario },
    });
    if (existente?.estado === 'Aceptada') {
      throw apiError(
        HttpStatus.CONFLICT,
        'YA_INSCRITO',
        'Ese usuario ya tiene acceso a esta subasta.',
      );
    }

    if (existente) {
      existente.estado = 'Aceptada';
      existente.fechaRespuesta = new Date();
      await this.reservasRepo.save(existente);
    } else {
      await this.reservasRepo.save(
        this.reservasRepo.create({
          idSubasta,
          idSubasta2: { idSubasta } as ReservasAcceso['idSubasta2'],
          idComprador: invitado.idUsuario,
          idComprador2: {
            idUsuario: invitado.idUsuario,
          } as ReservasAcceso['idComprador2'],
          estado: 'Aceptada',
        }),
      );
    }

    const mensaje = `Fuiste invitado a «${subasta.titulo}». Ya tienes acceso y puedes pujar cuando abra.`;
    await this.crearNotificacion(
      invitado.idUsuario,
      idSubasta,
      'Acceso',
      mensaje,
    );
    void this.notificationsGateway.notificarUsuario(invitado.idUsuario, {
      tipo: 'ACCESO',
      titulo: 'Invitación a subasta',
      mensaje,
      idSubasta,
    });

    return {
      mensaje: `Invitación enviada a ${correoLimpio} — ya tiene acceso.`,
    };
  }

  async responder(idReserva: string, idSubastador: string, aprobar: boolean) {
    const reserva = await this.reservasRepo.findOne({
      where: { idReserva },
      relations: ['idSubasta2', 'idComprador2'],
    });
    if (!reserva) {
      throw apiError(
        HttpStatus.NOT_FOUND,
        ErrorCodes.RESERVA_NO_ENCONTRADA,
        'La solicitud no existe.',
      );
    }

    const esDueno = await this.subastasRepo.findOne({
      where: {
        idSubasta: reserva.idSubasta,
        idSubastador: { idUsuario: idSubastador } as Subastas['idSubastador'],
      },
    });
    if (!esDueno) {
      throw apiError(
        HttpStatus.FORBIDDEN,
        ErrorCodes.SUBASTA_NO_PROPIA,
        'Solo el dueño de esta subasta puede responder solicitudes.',
      );
    }

    if (reserva.estado !== 'Pendiente') {
      throw apiError(
        HttpStatus.CONFLICT,
        ErrorCodes.RESERVA_YA_RESPONDIDA,
        'Esta solicitud ya fue respondida.',
      );
    }

    reserva.estado = aprobar ? 'Aceptada' : 'Rechazada';
    reserva.fechaRespuesta = new Date();
    await this.reservasRepo.save(reserva);

    const compradorId = reserva.idComprador2?.idUsuario;
    if (compradorId) {
      const mensaje = aprobar
        ? `Tu acceso a «${reserva.idSubasta2?.titulo}» fue concedido. ¡Ya puedes pujar!`
        : `Tu solicitud de acceso a «${reserva.idSubasta2?.titulo}» fue rechazada.`;
      await this.crearNotificacion(
        compradorId,
        reserva.idSubasta,
        'Acceso',
        mensaje,
      );
      void this.notificationsGateway.notificarUsuario(compradorId, {
        tipo: 'ACCESO',
        titulo: aprobar ? 'Acceso concedido' : 'Acceso rechazado',
        mensaje,
        idSubasta: reserva.idSubasta,
      });
    }

    return {
      idReserva,
      estado: reserva.estado,
      mensaje: aprobar
        ? 'Acceso concedido. El comprador ya puede pujar.'
        : 'Solicitud rechazada.',
    };
  }

  private async crearNotificacion(
    idUsuario: string,
    idSubasta: string,
    tipo: string,
    mensaje: string,
  ): Promise<void> {
    const repo = this.dataSource.getRepository(Notificaciones);
    await repo.save(
      repo.create({
        idUsuario,
        idUsuario2: { idUsuario } as Notificaciones['idUsuario2'],
        idSubasta: { idSubasta } as Notificaciones['idSubasta'],
        tipo,
        mensaje,
        canal: 'WebSocket',
      }),
    );
  }
}
