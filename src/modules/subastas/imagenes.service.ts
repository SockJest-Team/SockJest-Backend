import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import sharp from 'sharp';
import { randomUUID } from 'node:crypto';
import { apiError } from '../../common/utils/api-error';
import { ErrorCodes } from '../../common/constants/error-codes';
import {
  MAX_IMAGEN_BYTES,
  TIPOS_IMAGEN_PERMITIDOS,
} from './constants/imagenes.constants';
import 'multer';

export interface ResultadoVerificacionImagen {
  url: string;
  origen: 'link' | 'upload';
}

@Injectable()
export class ImagenesService {
  private readonly logger = new Logger(ImagenesService.name);

  constructor(
    @Inject('SUPABASE_CLIENT') private readonly supabase: SupabaseClient,
  ) {}

  async verificarUrl(url: string): Promise<ResultadoVerificacionImagen> {
    if (!/^https?:\/\//i.test(url)) {
      throw apiError(
        HttpStatus.BAD_REQUEST,
        ErrorCodes.IMAGEN_INVALIDA,
        'El enlace debe empezar con http:// o https://.',
      );
    }

    let respuesta: Response;
    try {
      respuesta = await fetch(url, {
        method: 'HEAD',
        redirect: 'follow',
        signal: AbortSignal.timeout(8_000),
      });
    } catch {
      throw apiError(
        HttpStatus.BAD_REQUEST,
        ErrorCodes.IMAGEN_NO_ACCESIBLE,
        'No pudimos acceder al enlace. Revísalo e intenta de nuevo.',
      );
    }

    if (!respuesta.ok) {
      throw apiError(
        HttpStatus.BAD_REQUEST,
        ErrorCodes.IMAGEN_NO_ACCESIBLE,
        'El enlace no respondió correctamente.',
      );
    }

    const tipo = respuesta.headers.get('content-type')?.split(';')[0] ?? '';
    if (!TIPOS_IMAGEN_PERMITIDOS.includes(tipo)) {
      throw apiError(
        HttpStatus.BAD_REQUEST,
        ErrorCodes.IMAGEN_INVALIDA,
        'El enlace no apunta a una imagen válida (JPG, PNG o WebP).',
      );
    }

    const tamano = Number(respuesta.headers.get('content-length') ?? 0);
    if (tamano > MAX_IMAGEN_BYTES) {
      throw apiError(
        HttpStatus.PAYLOAD_TOO_LARGE,
        ErrorCodes.IMAGEN_MUY_GRANDE,
        'La imagen del enlace supera el máximo de 5 MB.',
      );
    }

    return { url, origen: 'link' };
  }

  async subirArchivo(
    archivo: Express.Multer.File,
  ): Promise<ResultadoVerificacionImagen> {
    if (!TIPOS_IMAGEN_PERMITIDOS.includes(archivo.mimetype)) {
      throw apiError(
        HttpStatus.BAD_REQUEST,
        ErrorCodes.IMAGEN_INVALIDA,
        'Solo se aceptan imágenes JPG, PNG o WebP.',
      );
    }
    if (archivo.size > MAX_IMAGEN_BYTES) {
      throw apiError(
        HttpStatus.PAYLOAD_TOO_LARGE,
        ErrorCodes.IMAGEN_MUY_GRANDE,
        'La imagen supera el máximo de 5 MB.',
      );
    }

    try {
      const meta = await sharp(archivo.buffer).metadata();
      if (!meta.width || meta.width < 200 || !meta.format) {
        throw apiError(
          HttpStatus.BAD_REQUEST,
          ErrorCodes.IMAGEN_INVALIDA,
          'La imagen es muy pequeña o inválida (mínimo 200px de ancho).',
        );
      }
    } catch (e) {
      if (e instanceof HttpException) throw e;
      throw apiError(
        HttpStatus.BAD_REQUEST,
        ErrorCodes.IMAGEN_INVALIDA,
        'El archivo está corrupto o no es una imagen.',
      );
    }

    const bufferOptimizado = await sharp(archivo.buffer)
      .resize(1280, 1280, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();

    const ruta = `subastas/${Date.now()}-${randomUUID()}.webp`;
    const { error } = await this.supabase.storage
      .from('imagenes')
      .upload(ruta, bufferOptimizado, { contentType: 'image/webp' });

    if (error) {
      this.logger.error('Supabase storage upload falló:', error.message);
      throw apiError(
        HttpStatus.INTERNAL_SERVER_ERROR,
        ErrorCodes.ERROR_SUBIDA,
        'No pudimos guardar la imagen. Intenta de nuevo.',
      );
    }

    const { data } = this.supabase.storage.from('imagenes').getPublicUrl(ruta);
    return { url: data.publicUrl, origen: 'upload' };
  }
}
