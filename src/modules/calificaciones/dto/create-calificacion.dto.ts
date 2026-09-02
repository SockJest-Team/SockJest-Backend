import { IsInt, IsString, Max, Min, IsUUID } from 'class-validator';

export class CreateCalificacionDto {
  @IsUUID()
  idSubasta: string;

  @IsInt()
  @Min(1)
  @Max(5)
  puntuacion: number;

  @IsString()
  comentario: string;
}
