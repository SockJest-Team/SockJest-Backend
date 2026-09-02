import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Pujas } from '../../entities/Pujas';
import { Repository } from 'typeorm';
import { Subastas } from '../../entities/Subastas';
import { NotFoundError } from 'rxjs';

@Injectable()
export class BidsService {
    constructor(
        @InjectRepository(Pujas) private readonly pujasRepo: Repository<Pujas>,
        @InjectRepository(Subastas) private readonly subastasRepo: Repository<Subastas>,
    ) { }

    async placeBid(
        idSubasta: string,
        idUsuario: string,
        monto: number,
        ip: string,
        dispositivo: string,
    ) {
        const subasta = await this.subastasRepo.findOneBy({ idSubasta });
        if (!subasta) throw new NotFoundException('Subasta no encontrada');

        if (subasta.estado !== 'Activa') {
            throw new BadRequestException('La subasta no está activa');
        }

        const totalPujas = await this.pujasRepo.count({
            where: { idSubasta },
        });

        const precioBase = parseFloat(subasta.precioBase);
        const incrementoPct = parseFloat(subasta.incrementoMinimoPct);
        let ultimaGanadora: Pujas | null = null;

        if (totalPujas === 0) {
            if (monto < precioBase) {
                throw new BadRequestException(
                    `La primera puja debe ser mayor o igual al precio base (${precioBase})`,
                );
            }
        } else {
            ultimaGanadora = await this.pujasRepo.findOne({
                where: { idSubasta },
                order: { monto: 'DESC' },
            });

            if (!ultimaGanadora) {
                throw new BadRequestException('No se encontro la puja anterior');
            }

            const montoAnterior = parseFloat(ultimaGanadora.monto);

            if (totalPujas === 1) {
                const minimoRequerido = montoAnterior * (1 + incrementoPct / 100);
                if (monto < minimoRequerido) {
                    throw new BadRequestException(
                        `La segunda puja debe ser al menos ${minimoRequerido.toFixed(2)}`,
                    );
                }
            } else {
                if (monto <= montoAnterior) {
                    throw new BadRequestException(
                        `La puja debe ser mayor a la puja actual (${montoAnterior})`,
                    );
                }
            }

            await this.pujasRepo.update(
                { idPuja: ultimaGanadora.idPuja },
                { estado: 'Perdedora' },
            );
        }

        const nuevaPuja = this.pujasRepo.create({
            idSubasta,
            idUsuario,
            monto: monto.toString(),
            timestampMs: Date.now().toString(),
            ipAddress: ip,
            dispositivo,
            estado: 'Ganadora',
        });
        const guardada = await this.pujasRepo.save(nuevaPuja);

        const previousBidder = ultimaGanadora?.idUsuario ?? null;
        return {
            puja: guardada,
            previousBidder,
        };
    }

}
