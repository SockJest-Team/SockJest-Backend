import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Pagos } from '../../entities/Pagos';
import { CrearPagoDto } from './dto/crear-pago.dto';
import { Subastas } from '../../entities/Subastas';
import { Repository } from 'typeorm/repository/Repository';

@Injectable()
export class PagosService {
  constructor(
    @InjectRepository(Pagos) private readonly repo: Repository<Pagos>,
    @InjectRepository(Subastas)
    private readonly subastasRepo: Repository<Subastas>,
  ) {}

  async iniciarPago(dto: CrearPagoDto, idComprador: string) {
    const subasta = await this.subastasRepo.findOne({
      where: { idSubasta: dto.idSubasta },
      relations: ['idGanador'],
    });
    if (!subasta) {
      throw new NotFoundException('Subasta no encontrada');
    }
    if (subasta.estado !== 'Finalizada')
      throw new BadRequestException('La subasta no ha finalizado aún');
    if (subasta.idGanador?.idUsuario !== idComprador)
      throw new BadRequestException('No eres el ganador de la subasta');

    const pagoExistente = await this.repo.findOneBy({
      idSubasta: dto.idSubasta,
    });
    if (pagoExistente && pagoExistente.estado === 'Completado')
      throw new BadRequestException('Esta subasta ya esta pagada');

    const fechaLimite = new Date();
    fechaLimite.setHours(fechaLimite.getHours() + 48);
    const nuevoPago = this.repo.create({
      idSubasta: dto.idSubasta,
      monto: dto.monto.toString(),
      estado: 'Pendiente',
      fechaLimite,
      idComprador: { idUsuario: idComprador } as any,
      idSubasta2: { idSubasta: dto.idSubasta } as any,
    });
    return this.repo.save(nuevoPago);
  }

  async confirmarPago(idPago: string, referenciaPasarela: string) {
    const pago = await this.repo.findOneBy({ idPago });
    if (!pago) throw new NotFoundException('Pago no encontrado');
    if (pago.estado === 'Completado')
      throw new BadRequestException('El pago ya estaba completado');

    pago.estado = 'Completado';
    pago.fechaPago = new Date();
    pago.referenciaPasarela = referenciaPasarela;
    return this.repo.save(pago);
  }
}
