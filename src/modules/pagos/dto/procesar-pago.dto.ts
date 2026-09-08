import { Type } from 'class-transformer';
import {
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Matches,
  Min,
} from 'class-validator';

export const METODOS_PAGO = ['tarjeta', 'pse', 'nequi'] as const;
export type MetodoPago = (typeof METODOS_PAGO)[number];

export class ProcesarPagoDto {
  @IsIn(METODOS_PAGO)
  readonly metodo!: MetodoPago;

  @IsOptional()
  @IsString()
  @Length(16, 19)
  @Matches(/^[0-9]+$/)
  readonly numeroTarjeta?: string;

  @IsOptional()
  @IsString()
  @Length(3, 4)
  @Matches(/^[0-9]+$/)
  readonly cvv?: string;

  @IsOptional()
  @IsString()
  @Matches(/^(0[1-9]|1[0-2])\/\d{2}$/)
  readonly expiracion?: string;

  @IsOptional()
  @IsString()
  @Length(2, 100)
  readonly nombreTitular?: string;

  @IsOptional()
  @IsString()
  readonly banco?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[0-9]{10}$/)
  readonly celular?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  readonly cuotas?: number;
}
