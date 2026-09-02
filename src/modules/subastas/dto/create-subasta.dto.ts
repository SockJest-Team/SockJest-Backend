import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsNumber,
  IsNumberString,
  IsOptional,
  IsPositive,
  isPositive,
  IsString,
} from 'class-validator';

export class CreateSubastaDto {
  @IsNumberString()
  idCategoria: string;

  @IsString()
  titulo: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsString()
  politicaEnvio: string;

  @IsNumber()
  @IsPositive()
  precioBase: number;

  @IsOptional()
  @IsNumber()
  incrementoMinimoPct?: number;

  @IsOptional()
  @IsBoolean()
  requiereReserva?: boolean;

  @IsOptional()
  @IsInt()
  limiteUsuariosConcurrentes?: number;

  @IsDateString()
  fechaInicio: string;

  @IsDateString()
  fechaFin: string;
}
