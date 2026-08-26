import { IsIn } from 'class-validator';

export class UpdateReservasDto {
    @IsIn(['Concedido', 'Rechazado'])
    estado: string;
}
