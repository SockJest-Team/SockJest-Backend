import { IsNumber, IsPositive, IsString } from 'class-validator';

export class CreatePujaDto {
  @IsString()
  idSubasta: string;

  @IsNumber()
  @IsPositive()
  monto: number;
}
