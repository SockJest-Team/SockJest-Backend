import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Pujas } from '../../entities/Pujas';
import { Subastas } from '../../entities/Subastas';

@Injectable()
export class BidsService {
    constructor(
        @InjectRepository(Pujas) private readonly pujasRepo: Repository<Pujas>,
        @InjectRepository(Subastas) private readonly subastasRepo: Repository<Subastas>,
        @InjectDataSource() private readonly dataSource: DataSource,
    ) { }

    async placeBid(
        idSubasta: string,
        idUsuario: string,
        monto: number,
        ip: string,
        dispositivo: string,
    ) {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            // Lock pesimista: ninguna otra puja concurrente sobre esta misma
            // subasta puede leer/escribir hasta que esta transacción termine.
            const subasta = await queryRunner.manager
                .createQueryBuilder(Subastas, 'subasta')
                .setLock('pessimistic_write')
                .where('subasta.idSubasta = :id', { id: idSubasta })
                .getOne();

            if (!subasta) throw new NotFoundException('Subasta no encontrada');

            if (subasta.estado !== 'Activa') {
                throw new BadRequestException('La subasta no está activa');
            }
            if (new Date() > new Date(subasta.fechaFin)){
                throw new BadRequestException('La subasta ha finalizado');
            }

            const totalPujas = await queryRunner.manager.count(Pujas, {
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
                ultimaGanadora = await queryRunner.manager.findOne(Pujas, {
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

                await queryRunner.manager.update(
                    Pujas,
                    { idPuja: ultimaGanadora.idPuja },
                    { estado: 'Perdedora' },
                );
            }

            const nuevaPuja = queryRunner.manager.create(Pujas, {
                idSubasta,
                idUsuario,
                monto: monto.toString(),
                timestampMs: Date.now().toString(),
                ipAddress: ip,
                dispositivo,
                estado: 'Ganadora',
            });
            const guardada = await queryRunner.manager.save(nuevaPuja);

            await queryRunner.commitTransaction();

            const previousBidder = ultimaGanadora?.idUsuario ?? null;
            return {
                puja: guardada,
                previousBidder,
            };
        } catch (err) {
            await queryRunner.rollbackTransaction();
            throw err;
        } finally {
            await queryRunner.release();
        }
    }
}