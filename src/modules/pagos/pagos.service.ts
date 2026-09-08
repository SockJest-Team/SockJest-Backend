import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Pagos } from '../../entities/Pagos';
import { Subastas } from '../../entities/Subastas';
import { Notificaciones } from '../../entities/Notificaciones';
import { Usuarios } from '../../entities/Usuarios';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { EmailService } from '../email/email.service';
import {
  PasarelaSimuladaAdapter,
  PasarelaPagoAdapter,
} from './pasarela-simulada.adapter';
import { ProcesarPagoDto } from './dto/procesar-pago.dto';
import { apiError } from '../../common/utils/api-error';
import { ErrorCodes } from '../../common/constants/error-codes';

@Injectable()
export class PagosService {
  private readonly logger = new Logger(PagosService.name);

  constructor(
    @InjectRepository(Pagos) private readonly pagosRepo: Repository<Pagos>,
    @InjectRepository(Subastas)
    private readonly subastasRepo: Repository<Subastas>,
    @InjectRepository(Usuarios)
    private readonly usuariosRepo: Repository<Usuarios>,
    private readonly pasarela: PasarelaSimuladaAdapter,
    private readonly notificationsGateway: NotificationsGateway,
    private readonly emailService: EmailService,
  ) {}

  async findMisPagos(userId: string) {
    const pagos = await this.pagosRepo.find({
      where: { idComprador: { idUsuario: userId } as Pagos['idComprador'] },
      relations: ['idSubasta2'],
      order: { estado: 'ASC', fechaLimite: 'ASC' },
    });

    return pagos.map((p) => this.mapearPago(p));
  }

  async findPago(idPago: string, userId: string) {
    const pago = await this.pagoConRelaciones(idPago);

    this.asegurarDueno(pago, userId);
    return this.mapearPago(pago);
  }

  async procesarPago(idPago: string, userId: string, dto: ProcesarPagoDto) {
    const pago = await this.pagoConRelaciones(idPago);

    this.asegurarDueno(pago, userId);

    if (pago.estado === 'Pagado') {
      throw apiError(
        HttpStatus.CONFLICT,
        ErrorCodes.PAGO_YA_PROCESADO,
        'Este pago ya fue procesado exitosamente.',
      );
    }
    if (pago.estado !== 'Pendiente') {
      throw apiError(
        HttpStatus.CONFLICT,
        ErrorCodes.PAGO_VENCIDO,
        `Este pago está en estado "${pago.estado}" y ya no puede pagarse.`,
      );
    }
    if (pago.fechaLimite < new Date()) {
      throw apiError(
        HttpStatus.CONFLICT,
        ErrorCodes.PAGO_VENCIDO,
        'El plazo de 48 horas expiró. El lote pasa al siguiente postor.',
      );
    }

    const monto = parseFloat(pago.monto);
    const resultado = await this.pasarela.procesar(monto, dto);

    if (!resultado.exitosa) {
      throw apiError(
        HttpStatus.PAYMENT_REQUIRED,
        ErrorCodes.DATOS_TARJETA_INVALIDOS,
        resultado.mensaje,
      );
    }

    pago.estado = 'Pagado';
    pago.fechaPago = new Date();
    pago.referenciaPasarela = resultado.referencia;
    await this.pagosRepo.save(pago);

    const pagoMapeado = this.mapearPago(pago);

    await this.notificarPagoExitoso(pago);

    this.logger.log(
      `Pago ${idPago} procesado: $${monto.toFixed(2)} → ${resultado.referencia}`,
    );

    return {
      ...pagoMapeado,
      metodo: resultado.metodo,
      mensaje: '¡Pago confirmado! El subastador ha sido notificado.',
    };
  }

  private async notificarPagoExitoso(pago: Pagos): Promise<void> {
    try {
      const subasta = pago.idSubasta2;
      const subastadorId = subasta?.idSubastador?.idUsuario;
      const compradorId = pago.idComprador?.idUsuario;

      if (subastadorId) {
        await this.pagosRepo.manager.getRepository(Notificaciones).save(
          this.pagosRepo.manager.getRepository(Notificaciones).create({
            idUsuario: subastadorId,
            idUsuario2: {
              idUsuario: subastadorId,
            } as Notificaciones['idUsuario2'],
            idSubasta: {
              idSubasta: subasta.idSubasta,
            } as Notificaciones['idSubasta'],
            tipo: 'PagoConfirmado',
            mensaje: `El ganador pagó «${subasta.titulo}» ($${pago.monto}). Coordinen el envío del producto.`,
            canal: 'WebSocket',
          }),
        );

        this.notificationsGateway.notificarUsuario(subastadorId, {
          tipo: 'VICTORIA',
          titulo: '¡Venta confirmada!',
          mensaje: `El ganador pagó «${subasta.titulo}» ($${pago.monto}). Coordinen el envío.`,
          idSubasta: subasta.idSubasta,
        });

        const [subastador] = await this.usuariosRepo.find({
          where: { idUsuario: subastadorId },
        });
        if (subastador) {
          await this.emailService.correoPagoConfirmadoSubastador(
            { email: subastador.correo, nombre: subastador.nombreCompleto },
            {
              titulo: subasta.titulo,
              monto: pago.monto,
              referencia: pago.referenciaPasarela ?? '',
            },
          );
        }
      }

      if (compradorId) {
        const [comprador] = await this.usuariosRepo.find({
          where: { idUsuario: compradorId },
        });
        if (comprador) {
          await this.emailService.correoPagoConfirmadoComprador(
            { email: comprador.correo, nombre: comprador.nombreCompleto },
            {
              titulo: subasta.titulo,
              monto: pago.monto,
              referencia: pago.referenciaPasarela ?? '',
            },
          );
        }
      }
    } catch (e) {
      this.logger.warn(
        `Notificaciones post-pago fallaron (pago ${pago.idPago}): ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }

  private async pagoConRelaciones(idPago: string): Promise<Pagos> {
    if (!idPago || ['undefined', 'null', ''].includes(idPago)) {
      throw apiError(
        HttpStatus.NOT_FOUND,
        ErrorCodes.PAGO_NO_ENCONTRADO,
        'Pago inválido.',
      );
    }
    const pago = await this.pagosRepo.findOne({
      where: { idPago },
      relations: ['idSubasta2', 'idSubasta2.idSubastador', 'idComprador'],
    });
    if (!pago) {
      throw apiError(
        HttpStatus.NOT_FOUND,
        ErrorCodes.PAGO_NO_ENCONTRADO,
        'Este pago no existe.',
      );
    }
    return pago;
  }

  private asegurarDueno(pago: Pagos, userId: string): void {
    if (pago.idComprador?.idUsuario !== userId) {
      throw apiError(
        HttpStatus.FORBIDDEN,
        ErrorCodes.PAGO_NO_PROPIO,
        'Este pago pertenece a otro usuario.',
      );
    }
  }

  private mapearPago(p: Pagos) {
    return {
      idPago: p.idPago,
      idSubasta: p.idSubasta,
      tituloSubasta: p.idSubasta2?.titulo ?? 'Subasta',
      monto: p.monto,
      estado: p.estado,
      fechaLimite: p.fechaLimite,
      fechaPago: p.fechaPago,
      referenciaPasarela: p.referenciaPasarela,
      politicaEnvio: p.idSubasta2?.politicaEnvio ?? '',
    };
  }
}
