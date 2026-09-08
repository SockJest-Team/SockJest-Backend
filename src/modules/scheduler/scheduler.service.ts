import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DataSource, LessThanOrEqual, MoreThan, Repository } from 'typeorm';
import { Subastas } from '../../entities/Subastas';
import { Pujas } from '../../entities/Pujas';
import { Pagos } from '../../entities/Pagos';
import { Notificaciones } from '../../entities/Notificaciones';
import { Usuarios } from '../../entities/Usuarios';
import { SubastaHistorialEstados } from '../../entities/SubastaHistorialEstados';
import { AuctionGateway } from '../auction/auction.gateway';
import { EmailService } from '../email/email.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';

const HORAS_LIMITE_PAGO = 48;
const COMISION_PCT = 0.05;

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Subastas)
    private readonly subastasRepo: Repository<Subastas>,
    @InjectRepository(Pujas)
    private readonly pujasRepo: Repository<Pujas>,
    @InjectRepository(Pagos)
    private readonly pagosRepo: Repository<Pagos>,
    @InjectRepository(Usuarios)
    private readonly usuariosRepo: Repository<Usuarios>,
    private readonly auctionGateway: AuctionGateway,
    private readonly emailService: EmailService,
    private readonly notificationsGateway: NotificationsGateway,
  ) {}

  @Cron(CronExpression.EVERY_10_SECONDS)
  async gestionarEstadosSubastas(): Promise<void> {
    await this.protegido('abrirSubastas', () =>
      this.abrirSubastasProgramadas(),
    );
    await this.protegido('cerrarSubastas', () => this.cerrarSubastasVencidas());
    await this.protegido('pagosVencidos', () => this.gestionarPagosVencidos());
  }

  private async protegido(
    nombre: string,
    fn: () => Promise<void>,
  ): Promise<void> {
    try {
      await fn();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const esRed =
        /ENOTFOUND|ETIMEDOUT|ECONNREFUSED|Connection terminated/i.test(msg);
      this.logger.error(
        esRed
          ? `❌ [SCHEDULER] BD INALCANZABLE en ${nombre}: ${msg} (reintentará en 10s)`
          : `❌ [SCHEDULER] BUG en ${nombre}: ${e instanceof Error ? e.stack : String(e)}`,
      );
    }
  }

  private async abrirSubastasProgramadas(): Promise<void> {
    const ahora = new Date();

    const subastasParaAbrir = await this.subastasRepo.find({
      where: {
        estado: 'Aprobada',
        fechaInicio: LessThanOrEqual(ahora),
        fechaFin: MoreThan(ahora),
      },
      relations: ['idSubastador'],
    });

    for (const subasta of subastasParaAbrir) {
      await this.subastasRepo.update(
        { idSubasta: subasta.idSubasta },
        { estado: 'Activa' },
      );
      await this.registrarHistorial(
        subasta.idSubasta,
        'Aprobada',
        'Activa',
        subasta.idSubastador?.idUsuario,
      );

      this.auctionGateway.notificarInicio(subasta.idSubasta);

      const subastadorId = subasta.idSubastador?.idUsuario;
      if (subastadorId) {
        void this.notificationsGateway.notificarUsuario(subastadorId, {
          tipo: 'INICIO_SUBASTA',
          titulo: 'Tu subasta está en vivo',
          mensaje: `«${subasta.titulo}» acaba de abrir. ¡La puja ha comenzado!`,
          idSubasta: subasta.idSubasta,
        });
      }

      this.logger.log(`Subasta ${subasta.idSubasta} activada (programada)`);
    }
  }

  private async cerrarSubastasVencidas(): Promise<void> {
    const ahora = new Date();

    const subastasParaCerrar = await this.subastasRepo.find({
      where: { estado: 'Activa', fechaFin: LessThanOrEqual(ahora) },
      relations: ['idSubastador'],
    });

    for (const subasta of subastasParaCerrar) {
      try {
        const resultado = await this.dataSource.transaction(
          async (em): Promise<{ pujaGanadora: Pujas | null } | undefined> => {
            const fresh = await em
              .getRepository(Subastas)
              .createQueryBuilder('sub')
              .setLock('pessimistic_write', undefined, ['sub'])
              .where('sub.idSubasta = :id', { id: subasta.idSubasta })
              .getOne();

            if (!fresh || fresh.estado !== 'Activa') return undefined;

            fresh.estado = 'Finalizada';

            const pujaGanadora = await em.getRepository(Pujas).findOne({
              where: { idSubasta: fresh.idSubasta, estado: 'Ganadora' },
              order: { monto: 'DESC', idPuja: 'DESC' },
            });

            if (pujaGanadora) {
              fresh.idGanador = {
                idUsuario: pujaGanadora.idUsuario,
              } as Subastas['idGanador'];

              await em.getRepository(Pagos).save(
                em.getRepository(Pagos).create({
                  idSubasta: fresh.idSubasta,
                  idSubasta2: {
                    idSubasta: fresh.idSubasta,
                  } as Pagos['idSubasta2'],
                  idComprador: {
                    idUsuario: pujaGanadora.idUsuario,
                  } as Pagos['idComprador'],
                  monto: pujaGanadora.monto,
                  estado: 'Pendiente',
                  fechaLimite: new Date(
                    Date.now() + HORAS_LIMITE_PAGO * 3_600_000,
                  ),
                }),
              );

              await em.getRepository(Notificaciones).save(
                em.getRepository(Notificaciones).create({
                  idUsuario: pujaGanadora.idUsuario,
                  idUsuario2: {
                    idUsuario: pujaGanadora.idUsuario,
                  } as Notificaciones['idUsuario2'],
                  idSubasta: {
                    idSubasta: fresh.idSubasta,
                  } as Notificaciones['idSubasta'],
                  tipo: 'Victoria',
                  mensaje: `¡Ganaste "${fresh.titulo}"! Tienes ${HORAS_LIMITE_PAGO} horas para completar el pago.`,
                  canal: 'WebSocket',
                }),
              );
            }

            await em.getRepository(Subastas).save(fresh);
            return { pujaGanadora };
          },
        );

        if (!resultado) continue;

        await this.registrarHistorial(
          subasta.idSubasta,
          'Activa',
          'Finalizada',
          subasta.idSubastador?.idUsuario,
        );

        this.auctionGateway.notificarCierre(subasta.idSubasta, {
          conGanador: Boolean(resultado.pujaGanadora),
          montoFinal: resultado.pujaGanadora?.monto ?? null,
        });

        this.logger.log(
          `Subasta ${subasta.idSubasta} finalizada ${resultado.pujaGanadora ? 'con ganador' : 'sin pujas'}`,
        );

        if (resultado.pujaGanadora) {
          void this.notificationsGateway.notificarUsuario(
            resultado.pujaGanadora.idUsuario,
            {
              tipo: 'VICTORIA',
              titulo: '¡Ganaste la subasta!',
              mensaje: `Ganaste «${subasta.titulo}» por ${resultado.pujaGanadora.monto}. Tienes ${HORAS_LIMITE_PAGO} horas para pagar.`,
              idSubasta: subasta.idSubasta,
            },
          );

          await this.enviarCorreosCierre(subasta, resultado.pujaGanadora);
        }
      } catch (e) {
        this.logger.error(
          `Error cerrando subasta ${subasta.idSubasta}: ${e instanceof Error ? e.message : String(e)}`,
        );
      }
    }
  }

  private async enviarCorreosCierre(
    subasta: Subastas,
    pujaGanadora: Pujas,
  ): Promise<void> {
    try {
      const monto = parseFloat(pujaGanadora.monto);

      const [ganador] = await this.usuariosRepo.find({
        where: { idUsuario: pujaGanadora.idUsuario },
      });
      if (ganador) {
        await this.emailService.correoGanador(
          { email: ganador.correo, nombre: ganador.nombreCompleto },
          {
            titulo: subasta.titulo,
            monto: pujaGanadora.monto,
            horas: HORAS_LIMITE_PAGO,
          },
        );
      }

      const subastadorUsuario = subasta.idSubastador
        ? await this.usuariosRepo.findOne({
            where: { idUsuario: subasta.idSubastador.idUsuario },
          })
        : null;

      if (subastadorUsuario) {
        await this.emailService.correoVentaSubastador(
          {
            email: subastadorUsuario.correo,
            nombre: subastadorUsuario.nombreCompleto,
          },
          {
            titulo: subasta.titulo,
            monto: pujaGanadora.monto,
            comision: monto * COMISION_PCT,
            neto: monto * (1 - COMISION_PCT),
          },
        );
      }
    } catch (e) {
      this.logger.error(
        `Error enviando correos de cierre (subasta ${subasta.idSubasta}): ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }

  private async gestionarPagosVencidos(): Promise<void> {
    const ahora = new Date();
    const vencidos = await this.pagosRepo.find({
      where: { estado: 'Pendiente' },
    });

    for (const pago of vencidos) {
      if (pago.fechaLimite > ahora) continue;

      const subasta = await this.subastasRepo.findOne({
        where: { idSubasta: pago.idSubasta },
        relations: ['idSubastador', 'idGanador'],
      });
      if (!subasta) continue;

      const segundaPuja = await this.pujasRepo.findOne({
        where: { idSubasta: pago.idSubasta, estado: 'Perdedora' },
        order: { monto: 'DESC', idPuja: 'DESC' },
      });

      if (segundaPuja) {
        await this.pujasRepo.update(
          { idSubasta: pago.idSubasta, estado: 'Ganadora' },
          { estado: 'Vencida' },
        );
        await this.pujasRepo.update(
          { idPuja: segundaPuja.idPuja },
          { estado: 'Ganadora' },
        );

        subasta.idGanador = {
          idUsuario: segundaPuja.idUsuario,
        } as Subastas['idGanador'];
        await this.subastasRepo.save(subasta);

        const pagoEntidad = await this.pagosRepo.findOne({
          where: { idPago: pago.idPago },
          relations: ['idComprador'],
        });
        if (pagoEntidad) {
          pagoEntidad.idComprador = {
            idUsuario: segundaPuja.idUsuario,
          } as Pagos['idComprador'];
          pagoEntidad.monto = segundaPuja.monto;
          pagoEntidad.estado = 'Pendiente';
          pagoEntidad.fechaLimite = new Date(
            Date.now() + HORAS_LIMITE_PAGO * 3_600_000,
          );
          pagoEntidad.fechaPago = null;
          pagoEntidad.referenciaPasarela = null;
          await this.pagosRepo.save(pagoEntidad);
        }

        const mensaje = `El ganador original no pagó: «${subasta.titulo}» es tuya por ${segundaPuja.monto}. Tienes ${HORAS_LIMITE_PAGO} horas para pagar.`;

        await this.crearNotificacion(
          segundaPuja.idUsuario,
          subasta.idSubasta,
          'Victoria',
          mensaje,
        );
        void this.notificationsGateway.notificarUsuario(segundaPuja.idUsuario, {
          tipo: 'VICTORIA',
          titulo: '¡La subasta es tuya!',
          mensaje,
          idSubasta: subasta.idSubasta,
        });

        const [segundoUsuario] = await this.usuariosRepo.find({
          where: { idUsuario: segundaPuja.idUsuario },
        });
        if (segundoUsuario) {
          await this.emailService.correoPagoVencido2oPuesto(
            {
              email: segundoUsuario.correo,
              nombre: segundoUsuario.nombreCompleto,
            },
            {
              titulo: subasta.titulo,
              monto: segundaPuja.monto,
              horas: HORAS_LIMITE_PAGO,
            },
          );
        }

        this.logger.log(
          `Pago vencido de subasta ${subasta.idSubasta}: cedido al 2º puesto (${segundaPuja.monto})`,
        );
      } else {
        await this.pagosRepo.update(
          { idPago: pago.idPago },
          { estado: 'Vencido' },
        );

        subasta.idGanador = null as unknown as Subastas['idGanador'];
        subasta.estado = 'Pendiente';
        subasta.motivoRechazo = `Devuelta por impago: ningún postor completó el pago en ${HORAS_LIMITE_PAGO} horas. Edítala y reenvíala a revisión.`;
        await this.subastasRepo.save(subasta);

        await this.registrarHistorial(
          subasta.idSubasta,
          'Finalizada',
          'Pendiente',
          subasta.idSubastador?.idUsuario,
        );

        const subastadorId = subasta.idSubastador?.idUsuario;
        if (subastadorId) {
          const mensaje = `«${subasta.titulo}» no concretó venta (el ganador no pagó). Puedes renovarla: edítala y publícala de nuevo.`;

          await this.crearNotificacion(
            subastadorId,
            subasta.idSubasta,
            'Renovacion',
            mensaje,
          );
          void this.notificationsGateway.notificarUsuario(subastadorId, {
            tipo: 'RENOVACION',
            titulo: 'Subasta devuelta',
            mensaje,
            idSubasta: subasta.idSubasta,
          });

          const [subastador] = await this.usuariosRepo.find({
            where: { idUsuario: subastadorId },
          });
          if (subastador) {
            await this.emailService.correoRenovacionSubastador(
              {
                email: subastador.correo,
                nombre: subastador.nombreCompleto,
              },
              { titulo: subasta.titulo },
            );
          }
        }

        this.logger.log(
          `Pago vencido de subasta ${subasta.idSubasta}: sin 2º puesto — devuelta al subastador`,
        );
      }
    }
  }

  private async registrarHistorial(
    idSubasta: string,
    estadoAnterior: string,
    estadoNuevo: string,
    idResponsable?: string,
  ): Promise<void> {
    const repo = this.dataSource.getRepository(SubastaHistorialEstados);
    await repo.save(
      repo.create({
        estadoAnterior,
        estadoNuevo,
        idSubasta: { idSubasta } as SubastaHistorialEstados['idSubasta'],
        ...(idResponsable && {
          idUsuarioResponsable: {
            idUsuario: idResponsable,
          } as SubastaHistorialEstados['idUsuarioResponsable'],
        }),
      }),
    );
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
