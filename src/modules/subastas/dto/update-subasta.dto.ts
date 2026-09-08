import { PartialType } from '@nestjs/swagger';
import { CreateSubastaDto } from './create-subasta.dto';

export class UpdateSubastaDto extends PartialType(CreateSubastaDto) {}
