import { Module } from '@nestjs/common';
import { SubastasService } from './subastas.service';
import { SubastasController } from './subastas.controller';

@Module({
  controllers: [SubastasController],
  providers: [SubastasService],
})
export class SubastasModule {}
