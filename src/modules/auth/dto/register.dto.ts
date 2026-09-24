import { IsString, IsEmail, MinLength, IsEnum } from 'class-validator';

export class RegisterDto {
  @IsString()
  @MinLength(2)
  nombre_completo: string;

  @IsEmail()
  correo: string;

  @IsString()
  @MinLength(8)
  contraseña: string;

  @IsString()
  telefono: string;

  @IsEnum(['Comprador', 'Subastador', 'Usuario'])
  rol: string;
}
