import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import * as sightengine from 'sightengine';

interface SightengineResponse {
  status: string;
  nudity?: { safe: number };
  violence?: { order: number };
}

@Injectable()
export class ImageModerationService {
  private readonly se: any;

  constructor() {
    this.se = sightengine('1684637011', '3xaaK9ZjCCFJzWH4QpQu92hLkDEE3EGU');
  }

  async checkImage(imageUrl: string): Promise<void> {
    try {
      const data: SightengineResponse = await this.se
        .check(['nudity', 'violence', 'scam'])
        .set_url(imageUrl);

      if (data.status === 'failure') {
        throw new BadRequestException('Error al procesar la imagen.');
      }

      const isUnsafeNudity = data.nudity && data.nudity.safe < 0.8;
      const isViolent = data.violence && (data.violence as any) > 0.5;

      if (isUnsafeNudity || isViolent) {
        throw new BadRequestException(
          'La imagen contiene contenido no permitido (+18, violencia o fraude).',
        );
      }
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new InternalServerErrorException(
        'Error de conexión con el servicio de moderación.',
      );
    }
  }
}
