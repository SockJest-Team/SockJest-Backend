import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';

export class CreatePujaDto {
  @IsString()
  @IsNotEmpty()
  readonly idSubasta!: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  readonly monto!: number;
}
