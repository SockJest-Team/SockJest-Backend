import { IsEmail, IsString, MinLength, IsIn } from 'class-validator';

export class RegisterDto {
  @IsString()
  nombre_completo: string;

  @IsEmail()
  correo: string;

  @IsString()
  @MinLength(8)
  contraseña: string;

  @IsString()
  telefono: string;

  @IsIn(['Comprador', 'Subastador', 'Usuario'])
  rol: string;
}