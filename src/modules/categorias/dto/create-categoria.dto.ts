import { IsOptional, IsString } from "class-validator"

export class CreateCategoriaDto {
    @IsString()
    nombre: string;

    @IsOptional()
    @IsString()
    descripcion?: string;

    @IsOptional()
    @IsString()
    idCategoriaPadre?: string;

}

