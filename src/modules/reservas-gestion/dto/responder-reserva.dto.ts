import { IsBoolean } from 'class-validator';

export class ResponderReservaDto {
  @IsBoolean()
  aprobar: boolean;
}
