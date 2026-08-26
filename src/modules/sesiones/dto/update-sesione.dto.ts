import { PartialType } from '@nestjs/swagger';
import { CreateSesioneDto } from './create-sesione.dto';

export class UpdateSesioneDto extends PartialType(CreateSesioneDto) {}
