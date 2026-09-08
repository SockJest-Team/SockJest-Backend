import { Type } from 'class-transformer';
import {
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  Max,
} from 'class-validator';

export class FiltroSubastasDto {
  @IsOptional()
  @IsString()
  readonly categoria?: string;

  @IsOptional()
  @IsString()
  readonly estado?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  readonly precioMin?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  readonly precioMax?: number;

  @IsOptional()
  @IsString()
  readonly buscar?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  readonly limit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  readonly offset?: number;
}
