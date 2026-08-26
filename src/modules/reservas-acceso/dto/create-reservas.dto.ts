import { IsString, IsNumberString } from "class-validator";

export class CreateReservasDto {
    @IsNumberString()
    idSubasta: string;

    @IsString()
    idComprador: string;
}
