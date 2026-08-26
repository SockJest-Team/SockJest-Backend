import { IsIn } from "class-validator";

export class ChangeRoleDto {
    @IsIn(['Comprador', 'Subastador', 'Usuario'])
    rol: string;
}
