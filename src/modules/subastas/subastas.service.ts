import { Injectable } from '@nestjs/common';
import { CreateSubastaDto } from './dto/create-subasta.dto';
import { UpdateSubastaDto } from './dto/update-subasta.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Subastas } from '../../entities/Subastas';
import { Repository } from 'typeorm';

@Injectable()
export class SubastasService {
  constructor(
    @InjectRepository(Subastas) private readonly repo: Repository<Subastas>,
  ){}

  create(dto: CreateSubastaDto, idSubastador: string) {
    const nueva = this.repo.create({
      ...dto,
      idSubastador: {idUsuario: idSubastador } as any,
      idCategoria2: {idCategoria: dto.idCategoria } as any,
    });
    return this.repo.save(nueva);
  }

  findAll() {
    return `This action returns all subastas`;
  }

  findOne(id: number) {
    return `This action returns a #${id} subasta`;
  }

  update(id: number, updateSubastaDto: UpdateSubastaDto) {
    return `This action updates a #${id} subasta`;
  }

  remove(id: number) {
    return `This action removes a #${id} subasta`;
  }
}
