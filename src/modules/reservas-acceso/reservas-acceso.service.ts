import {
  Injectable,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReservasAcceso } from '../../entities/ReservasAcceso';
import { Subastas } from '../../entities/Subastas';
import { CreateReservasDto } from './dto/create-reservas.dto';
import { UpdateReservasDto } from './dto/update-reservas.dto';

@Injectable()
export class ReservasAccesoService {
  constructor(
    @InjectRepository(ReservasAcceso)
    private readonly repo: Repository<ReservasAcceso>,
    @InjectRepository(Subastas)
    private readonly subastasRepo: Repository<Subastas>,
  ) {}

  async create(dto: CreateReservasDto) {
    const existe = await this.repo.findOneBy({
      idSubasta: dto.idSubasta,
      idComprador: dto.idComprador,
    });
    if (existe) {
      throw new ConflictException('Ya solicitaste acceso a esta subasta');
    }
    const nueva = this.repo.create(dto);
    return this.repo.save(nueva);
  }

  findAllBySubasta(idSubasta: string) {
    return this.repo.find({ where: { idSubasta } });
  }

  async findAllBySubastaForUser(idSubasta: string, userId: string) {
    await this.asegurarPropietarioSubasta(idSubasta, userId);
    return this.repo.find({ where: { idSubasta } });
  }

  findOne(idReserva: string) {
    return this.repo.findOneBy({ idReserva });
  }

  async findOneForUser(idReserva: string, userId: string) {
    const reserva = await this.repo.findOneBy({ idReserva });
    if (!reserva) {
      throw new NotFoundException('Reserva no encontrada');
    }
    await this.asegurarPropietarioSubasta(reserva.idSubasta, userId);
    return reserva;
  }

  async responder(idReserva: string, dto: UpdateReservasDto) {
    return this.repo.update(
      { idReserva },
      { estado: dto.estado, fechaRespuesta: new Date() },
    );
  }

  async responderForUser(
    idReserva: string,
    dto: UpdateReservasDto,
    userId: string,
  ) {
    const reserva = await this.repo.findOneBy({ idReserva });
    if (!reserva) {
      throw new NotFoundException('Reserva no encontrada');
    }
    await this.asegurarPropietarioSubasta(reserva.idSubasta, userId);
    return this.repo.update(
      { idReserva },
      { estado: dto.estado, fechaRespuesta: new Date() },
    );
  }

  private async asegurarPropietarioSubasta(
    idSubasta: string,
    userId: string,
  ): Promise<void> {
    const subasta = await this.subastasRepo.findOne({
      where: { idSubasta },
      relations: ['idSubastador'],
    });
    if (!subasta) {
      throw new NotFoundException('Subasta no encontrada');
    }
    if (subasta.idSubastador.idUsuario !== userId) {
      throw new ForbiddenException('No eres el subastador de esta subasta.');
    }
  }
}
