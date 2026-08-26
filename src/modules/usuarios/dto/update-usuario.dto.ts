import { IsIn, IsOptional, IsString } from "class-validator";
export class UpdateUsuarioDto {
    @IsOptional()
    @IsString()
    nombreCompleto?: string;

    @IsOptional()
    @IsString()
    telefono?: string;

    @IsOptional()
    @IsIn(['Activo', 'Inactivo', 'Bloqueado'])
    estado?: string;

}
