import { Injectable, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReservasAcceso } from '../../entities/ReservasAcceso';
import { CreateReservasDto } from './dto/create-reservas.dto';
import { UpdateReservasDto } from './dto/update-reservas.dto';

@Injectable()
export class ReservasAccesoService {
  constructor(
    @InjectRepository(ReservasAcceso) private readonly repo: Repository<ReservasAcceso>,
  ){}

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
    return this.repo.find({ where: {idSubasta}});
  }

  findOne(idReserva: string) {
    return this.repo.findOneBy({ idReserva});
  }

  async responder(idReserva: string, dto: UpdateReservasDto){
    return this.repo.update(
      {idReserva},
      { estado: dto.estado, fechaRespuesta: new Date()},
    );
  }

}
