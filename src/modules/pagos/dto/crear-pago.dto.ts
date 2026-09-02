import { IsNumber, IsPositive, IsString } from 'class-validator';

export class CrearPagoDto {
  @IsString()
  idSubasta: string;

  @IsNumber()
  @IsPositive()
  monto: number;
}
