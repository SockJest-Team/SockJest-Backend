import { IsString, IsNotEmpty, MinLength, MaxLength } from 'class-validator';

export class SuspenderSubastaDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  @MaxLength(500)
  motivo: string;
}
