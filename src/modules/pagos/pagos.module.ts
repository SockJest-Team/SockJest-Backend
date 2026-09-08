import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Pagos } from '../../entities/Pagos';
import { Subastas } from '../../entities/Subastas';
import { Usuarios } from '../../entities/Usuarios';
import { NotificationsModule } from '../notifications/notifications.module';
import { EmailModule } from '../email/email.module';
import { PagosController } from './pagos.controller';
import { PagosService } from './pagos.service';
import { PasarelaSimuladaAdapter } from './pasarela-simulada.adapter';

@Module({
  imports: [
    TypeOrmModule.forFeature([Pagos, Subastas, Usuarios]),
    NotificationsModule,
    EmailModule,
  ],
  controllers: [PagosController],
  providers: [PagosService, PasarelaSimuladaAdapter],
  exports: [PagosService],
})
export class PagosModule {}
