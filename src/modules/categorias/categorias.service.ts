import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateCategoriaDto } from './dto/create-categoria.dto';
import { UpdateCategoriaDto } from './dto/update-categoria.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Categorias } from '../../entities/Categorias';
import { In, Repository } from 'typeorm';
import { Subastas } from '../../entities/Subastas';

@Injectable()
export class CategoriasService {
  constructor(
    @InjectRepository(Categorias) private readonly repo: Repository<Categorias>,
    @InjectRepository(Subastas) private readonly subastasRepo: Repository<Subastas>,
  ){}

  create(dto: CreateCategoriaDto) {
    const { idCategoriaPadre, ...resto } = dto;
    const nueva = this.repo.create({
      ...resto,
      idCategoriaPadre2: idCategoriaPadre ? ({ idCategoria: idCategoriaPadre} as any) : undefined,
    });
    return this.repo.save(nueva);
  }

  findAll() {
    return this.repo.find({ where: {activa: true}});
  }

  async findOne(idCategoria: string) {
    const categoria = await this.repo.findOneBy({idCategoria});
    if(!categoria){
      throw new NotFoundException('Categoria no encontrada');
    }
    return categoria;
  }

  async update(idCategoria: string, dto: UpdateCategoriaDto) {
    await this.findOne(idCategoria);
    const {idCategoriaPadre, ...resto} = dto;

    await this.repo.update(
      {idCategoria},
      { ...resto,
        ...(idCategoriaPadre !==undefined && {
          idCategoriaPadre2: { idCategoria: idCategoriaPadre} as any,
        }),
      },
    );
    return this.findOne(idCategoria);
  }

  async remove(idCategoria: string) {
    await this.findOne(idCategoria);

    const subastasBloqueantes = await this.subastasRepo.count({
      where: {
        idCategoria2: {idCategoria} as any,
        estado: In(['Pendiente', 'Activa', 'Aprobada']),
      },
    });

    if(subastasBloqueantes > 0) {
      throw new ConflictException(
        'No se puede eliminar: la categoria tiene subastas activas o pendientes',    
      );
    }

    return this.repo.update({idCategoria}, {activa: false});
  }
}
