import { IsEmail, IsString } from 'class-validator';

export class InvitarDto {
  @IsString()
  idSubasta: string;

  @IsEmail()
  correo: string;
}
