import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { ProcesarPagoDto } from './dto/procesar-pago.dto';
import { apiError } from '../../common/utils/api-error';
import { ErrorCodes } from '../../common/constants/error-codes';
import { HttpStatus } from '@nestjs/common';

export interface ResultadoPasarela {
  exitosa: boolean;
  referencia: string;
  metodo: string;
  mensaje: string;
}

export interface PasarelaPagoAdapter {
  procesar(
    monto: number,
    datosPago: ProcesarPagoDto,
  ): Promise<ResultadoPasarela>;
}

@Injectable()
export class PasarelaSimuladaAdapter implements PasarelaPagoAdapter {
  private readonly logger = new Logger(PasarelaSimuladaAdapter.name);

  async procesar(
    monto: number,
    datos: ProcesarPagoDto,
  ): Promise<ResultadoPasarela> {
    this.validarDatos(datos);

    await new Promise((r) => setTimeout(r, 1200));

    const referencia = `PAY-${Date.now()}-${randomUUID().slice(0, 8).toUpperCase()}`;

    this.logger.log(
      `Pago simulado APROBADO: $${monto.toFixed(2)} vía ${datos.metodo} → ${referencia}`,
    );

    return {
      exitosa: true,
      referencia,
      metodo: datos.metodo,
      mensaje: 'Transacción aprobada.',
    };
  }

  private validarDatos(datos: ProcesarPagoDto): void {
    if (datos.metodo === 'tarjeta') {
      if (
        !datos.numeroTarjeta ||
        !datos.cvv ||
        !datos.expiracion ||
        !datos.nombreTitular
      ) {
        throw apiError(
          HttpStatus.BAD_REQUEST,
          ErrorCodes.DATOS_TARJETA_INVALIDOS,
          'Completa todos los datos de la tarjeta.',
        );
      }
      const [mes, anio] = datos.expiracion.split('/').map(Number);
      const finDeMes = new Date(2000 + anio, mes, 0, 23, 59, 59);
      if (finDeMes < new Date()) {
        throw apiError(
          HttpStatus.BAD_REQUEST,
          ErrorCodes.DATOS_TARJETA_INVALIDOS,
          'La tarjeta está vencida.',
        );
      }
    }

    if (datos.metodo === 'pse' && !datos.banco) {
      throw apiError(
        HttpStatus.BAD_REQUEST,
        ErrorCodes.DATOS_INVALIDOS,
        'Selecciona tu banco para PSE.',
      );
    }

    if (datos.metodo === 'nequi' && !datos.celular) {
      throw apiError(
        HttpStatus.BAD_REQUEST,
        ErrorCodes.DATOS_INVALIDOS,
        'Ingresa tu número de celular Nequi.',
      );
    }
  }
}
