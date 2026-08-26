import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateSubastaDto } from './create-subasta.dto';

// No se permite cambiar el estado desde aquí
export class UpdateSubastaDto extends PartialType(
  OmitType(CreateSubastaDto, [] as const),
) {}