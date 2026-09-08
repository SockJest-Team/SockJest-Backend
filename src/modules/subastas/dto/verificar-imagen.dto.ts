import { IsOptional, IsUrl } from 'class-validator';

export class VerificarImagenDto {
  @IsOptional()
  @IsUrl({ require_protocol: true })
  readonly url?: string;
}
