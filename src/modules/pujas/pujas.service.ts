import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Pujas } from '../../entities/Pujas';
import { Subastas } from '../../entities/Subastas';
import { NotificationsService } from '../notifications/notifications.service';
import { CreatePujaDto } from './dto/create-puja.dto';

@Injectable()
export class PujasService {
  constructor(
    @InjectRepository(Pujas) private readonly repo: Repository<Pujas>,
    @InjectRepository(Subastas)
    private readonly subastasRepo: Repository<Subastas>,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly notificationsService: NotificationsService,
  ) {}

  async registrarPuja(
    dto: CreatePujaDto,
    userId: string,
    ip: string,
    dispositivo: string,
  ) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const subasta = await queryRunner.manager
        .createQueryBuilder(Subastas, 'subasta')
        .setLock('pessimistic_write')
        .where('subasta.idSubasta = :id', { id: dto.idSubasta })
        .getOne();

      if (!subasta) {
        throw new NotFoundException('Subasta no encontrada');
      }
      if (subasta.estado !== 'Activa') {
        throw new ForbiddenException('La subasta no está activa');
      }
      if (new Date() > new Date(subasta.fechaFin)) {
        throw new ForbiddenException('La subasta ha finalizado');
      }

      const precioBase = parseFloat(subasta.precioBase);
      const incrementoPct = parseFloat(subasta.incrementoMinimoPct) || 5;

      const ultimaPuja = await queryRunner.manager.findOne(Pujas, {
        where: { idSubasta: dto.idSubasta },
        order: { monto: 'DESC' },
      });

      if (!ultimaPuja) {
        if (dto.monto < precioBase) {
          throw new BadRequestException(
            `La primera puja debe ser mayor o igual a ${precioBase}`,
          );
        }
      } else {
        if (!ultimaPuja.monto) {
          throw new InternalServerErrorException(
            'Error en el historial de la subasta: monto inválido',
          );
        }

        const montoUltimaPuja = parseFloat(ultimaPuja.monto);

        const minimoRequerido = montoUltimaPuja * (1 + incrementoPct / 100);

        if (dto.monto < minimoRequerido) {
          throw new BadRequestException(
            `El monto de la puja debe superar el incremento mínimo. Mínimo requerido: ${minimoRequerido.toFixed(2)}`,
          );
        }
      }

      const nuevaPuja = this.repo.create({
        idSubasta: dto.idSubasta,
        idUsuario: userId,
        monto: dto.monto.toString(),
        timestampMs: Date.now().toString(),
        ipAddress: ip,
        dispositivo,
        estado: 'Ganadora',
        idSubasta2: { idSubasta: dto.idSubasta },
        idUsuario2: { idUsuario: userId },
      });

      await queryRunner.manager.save(nuevaPuja);

      await queryRunner.manager
        .createQueryBuilder()
        .update(Pujas)
        .set({ estado: 'Perdedora' })
        .where('idSubasta = :idSubasta AND idPuja != :idPuja', {
          idSubasta: dto.idSubasta,
          idPuja: nuevaPuja.idPuja,
        })
        .execute();

      await queryRunner.commitTransaction();

      setImmediate(() => {
        this.notificationsService
          .enviarNotificacion(
            userId,
            'Tu puja fue registrada con éxito.',
            'PujaExitosa',
            dto.idSubasta,
          )
          .catch(console.error);
      });

      return nuevaPuja;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async findAllBySubasta(idSubasta: string) {
    return this.repo.find({
      where: { idSubasta },
      relations: ['idUsuario2'],
      order: { monto: 'DESC' },
    });
  }
}
