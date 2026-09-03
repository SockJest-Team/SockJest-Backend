import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Subastas } from '../../entities/Subastas';
import { LessThanOrEqual, MoreThan, Repository } from 'typeorm';
import { AuctionGateway } from '../auction/auction.gateway';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class SchedulerService {
    constructor(
        @InjectRepository(Subastas) private readonly subastasRepo: Repository<Subastas>,
        private readonly auctionGateway: AuctionGateway,
    ){}

    @Cron(CronExpression.EVERY_10_SECONDS)
    async iniciarSubastasProgramadas(){
        const ahora = new Date();

        const subastas = await this.subastasRepo.find({
            where: {
                estado: 'Aprobada',
                fechaInicio: LessThanOrEqual(ahora),
                fechaFin: MoreThan(ahora),
            }
        });
        
        for (const subasta of subastas){
            await this.subastasRepo.update(
                { idSubasta: subasta.idSubasta},
                { estado: 'Activa'},
            );

            this.auctionGateway.server
            .to(`auction_@{subasta.idSubasta}`)
            .emit('auctionStarted', { auctionId: subasta.idSubasta});
        }


    }
}
