import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { apiError } from '../utils/api-error';
import { ErrorCodes } from '../constants/error-codes';

interface RespuestaSightengine {
  status: 'success' | 'failure';
  nudity?: { safe?: number };
  scam?: { probability?: number };
  weapon?: number;
  gore?: { prob?: number };
}

const UMBRAL_SEGURIDAD_NUDEZ = 0.8;
const UMBRAL_RECHAZO = 0.5;
const TIMEOUT_MS = 10_000;

@Injectable()
export class ImageModerationService {
  private readonly logger = new Logger(ImageModerationService.name);

  private readonly apiUser: string;
  private readonly apiSecret: string;

  constructor() {
    this.apiUser = process.env.SIGHTENGINE_USER ?? '';
    this.apiSecret = process.env.SIGHTENGINE_SECRET ?? '';

    if (!this.apiUser || !this.apiSecret) {
      throw new Error(
        'Faltan SIGHTENGINE_USER / SIGHTENGINE_SECRET en el .env',
      );
    }
  }

  async checkImage(imageUrl: string): Promise<void> {
    const url = new URL('https://api.sightengine.com/1.0/check.json');
    url.searchParams.set('models', 'nudity,scam,weapon,gore');
    url.searchParams.set('api_user', this.apiUser);
    url.searchParams.set('api_secret', this.apiSecret);
    url.searchParams.set('url', imageUrl);

    let respuesta: RespuestaSightengine;
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
      respuesta = (await res.json()) as RespuestaSightengine;
    } catch (e) {
      this.logger.error(`Sightengine inaccesible (${imageUrl}): ${String(e)}`);
      throw apiError(
        HttpStatus.SERVICE_UNAVAILABLE,
        ErrorCodes.MODERACION_NO_DISPONIBLE,
        'El verificador de imágenes no está disponible. Intenta en unos minutos.',
      );
    }

    if (respuesta.status === 'failure') {
      this.logger.warn(`Sightengine no pudo procesar: ${imageUrl}`);
      throw apiError(
        HttpStatus.BAD_REQUEST,
        ErrorCodes.IMAGEN_NO_MODERABLE,
        'No pudimos analizar la imagen. Revisa el enlace e intenta de nuevo.',
      );
    }

    const nudezSegura = respuesta.nudity?.safe ?? 1;
    const probScam = respuesta.scam?.probability ?? 0;
    const arma = respuesta.weapon ?? 0;
    const gore = respuesta.gore?.prob ?? 0;

    const rechazada =
      nudezSegura < UMBRAL_SEGURIDAD_NUDEZ ||
      probScam > UMBRAL_RECHAZO ||
      arma > UMBRAL_RECHAZO ||
      gore > UMBRAL_RECHAZO;

    if (rechazada) {
      throw apiError(
        HttpStatus.BAD_REQUEST,
        ErrorCodes.IMAGEN_MODERACION_RECHAZADA,
        'La imagen fue rechazada por contenido no permitido (nudidad, violencia o posible fraude).',
      );
    }
  }
}
