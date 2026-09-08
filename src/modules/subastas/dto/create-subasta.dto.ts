import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  Max,
  Min,
  IsInt,
} from 'class-validator';
import { MAX_IMAGENES_POR_SUBASTA } from '../constants/subasta.constants';

export class CreateSubastaDto {
  @IsString()
  @Length(5, 150)
  readonly titulo!: string;

  @IsOptional()
  @IsString()
  @Length(0, 2000)
  readonly descripcion?: string;

  @IsString()
  @Length(10, 2000)
  readonly politicaEnvio!: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  readonly precioBase!: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  @Max(100)
  readonly incrementoMinimoPct?: number;

  @IsOptional()
  @IsBoolean()
  readonly requiereReserva?: boolean;

  @IsOptional()
  @IsBoolean()
  readonly esPrivada?: boolean;

  @IsDateString()
  readonly fechaInicio!: string;

  @IsDateString()
  readonly fechaFin!: string;

  @IsString()
  @IsNotEmpty()
  readonly idCategoria!: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_IMAGENES_POR_SUBASTA)
  @IsUrl({}, { each: true })
  readonly imagenes?: string[];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2, { message: 'El límite mínimo es 2 usuarios' })
  @Max(1000, { message: 'El límite máximo es 1000 usuarios' })
  readonly limiteUsuariosConcurrentes?: number;
}
