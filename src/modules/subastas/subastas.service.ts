import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Subastas } from '../../entities/Subastas';
import { CreateSubastaDto } from './dto/create-subasta.dto';
import { UpdateSubastaDto } from './dto/update-subasta.dto';

@Injectable()
export class SubastasService {
  constructor(
    @InjectRepository(Subastas) private readonly repo: Repository<Subastas>,
  ) { }

  create(dto: CreateSubastaDto, idSubastador: string) {
    const { precioBase, incrementoMinimoPct, ...resto } = dto;

    const nueva = this.repo.create({
      ...resto, // ya incluye idCategoria como string, sin problema
      precioBase: precioBase.toString(),
      incrementoMinimoPct: incrementoMinimoPct?.toString(),
      idSubastador: { idUsuario: idSubastador } as any, // esta sí la necesitas, porque idSubastador NO tiene columna plana, solo existe como relación
    });
    return this.repo.save(nueva);
  }

  findAll() {
    return this.repo.find();
  }

  async findOne(idSubasta: string) {
    const subasta = await this.repo.findOneBy({ idSubasta });
    if (!subasta) throw new NotFoundException('Subasta no encontrada');
    return subasta;
  }

  findAllBySubastador(idSubastador: string) {
    return this.repo.find({
      where: { idSubastador: { idUsuario: idSubastador } as any },
    });
  }

  async update(idSubasta: string, dto: UpdateSubastaDto, idUsuarioSolicitante: string) {
    const subasta = await this.findOne(idSubasta);

    if (subasta.idSubastador?.idUsuario !== idUsuarioSolicitante) {
      throw new ForbiddenException('Solo el subastador dueño puede editar esta subasta');
    }
    if (subasta.estado !== 'Pendiente') {
      throw new ForbiddenException('Solo se puede editar mientras está en estado Pendiente');
    }

    await this.repo.update({ idSubasta }, dto as any);
    return this.findOne(idSubasta);
  }

  async remove(idSubasta: string, idUsuarioSolicitante: string) {
    const subasta = await this.findOne(idSubasta);

    if (subasta.idSubastador?.idUsuario !== idUsuarioSolicitante) {
      throw new ForbiddenException('Solo el subastador dueño puede eliminar esta subasta');
    }
    if (subasta.estado !== 'Pendiente') {
      throw new ForbiddenException('No se puede eliminar una subasta ya aprobada o activa');
    }

    return this.repo.delete({ idSubasta });
  }
}