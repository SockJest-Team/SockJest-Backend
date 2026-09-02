import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm/dist/typeorm.module';
import { PagosService } from './pagos.service';
import { Subastas } from '../../entities/Subastas';
import { Pagos } from '../../entities/Pagos';
import { PagosController } from './pagos.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Pagos, Subastas])],
  controllers: [PagosController],
  providers: [PagosService],
})
export class PagosModule {}
